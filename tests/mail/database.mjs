import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

export const ids = {
  traveler: '11111111-1111-4111-8111-111111111111',
  second: '22222222-2222-4222-8222-222222222222',
  owner: '33333333-3333-4333-8333-333333333333',
  outsider: '44444444-4444-4444-8444-444444444444',
  admin: '55555555-5555-4555-8555-555555555555',
  agency: '66666666-6666-4666-8666-666666666666',
  publication: '77777777-7777-4777-8777-777777777777',
  departure: '88888888-8888-4888-8888-888888888888',
};

export async function createDatabase() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table profiles(id uuid primary key, full_name text, email text, phone text);
    create table agencies(id uuid primary key, owner_user_id uuid, commercial_name text, phone text, email text, status text);
    create table publications(id uuid primary key, agency_id uuid, title text, description text, destination text,
      meeting_point text, main_image_url text, service_type text default 'EXCURSION', price_per_person numeric, status text,
      created_at timestamptz default now(), updated_at timestamptz default now());
    create table publication_departures(id uuid primary key, publication_id uuid, start_at timestamptz,
      end_at timestamptz, capacity integer, status text, created_at timestamptz default now(), updated_at timestamptz default now());
    create function public.set_updated_at() returns trigger language plpgsql as $$begin NEW.updated_at=now();return NEW;end;$$;
  `);
  for (const file of [
    'supabase/migrations/202609220002_reservations.sql',
    'supabase/migrations/202610050001_reservation_retries.sql',
    'docs/sql/reservations-auto-confirm.sql',
    'supabase/migrations/202610200001_cancel_departure_reservations.sql',
  ]) await db.exec(await readFile(new URL('../../' + file, import.meta.url), 'utf8'));

  const path = (row, key) => key.split('.').reduce((value, field) => value?.[field], row);
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.orders = []; this.offset = 0; this.end = Infinity; }
    select(selection) { this.selection = selection; return this; }
    eq(key, value) { this.filters.push(row => path(row, key) === value); return this; }
    neq(key, value) { this.filters.push(row => path(row, key) !== value); return this; }
    in(key, values) { this.filters.push(row => values.includes(path(row, key))); return this; }
    order(key, { ascending = true } = {}) { this.orders.push([key, ascending]); return this; }
    range(start, end) { this.offset = start; this.end = end + 1; return this; }
    limit(end) { this.end = end; return this; }
    update(values) { this.values = values; return this; }
    maybeSingle() { this.singleRow = true; return this; }
    single() { this.singleRow = true; return this; }
    then(resolve, reject) { return this.run().then(resolve, reject); }
    async run() {
      try {
        const tables = {};
        for (const table of ['profiles', 'agencies', 'publications', 'publication_departures', 'reservations']) {
          tables[table] = (await db.query(`select * from public.${table}`)).rows;
        }
        const publication = row => row ? { ...row, agencies: tables.agencies.find(a => a.id === row.agency_id) } : null;
        const departure = row => row ? { ...row, publications: publication(tables.publications.find(p => p.id === row.publication_id)) } : null;
        const embed = row => this.table === 'reservations' ? { ...row,
          profiles: tables.profiles.find(p => p.id === row.passenger_id),
          publication_departures: departure(tables.publication_departures.find(d => d.id === row.departure_id)),
          reservation_ratings: [],
        } : this.table === 'publication_departures' ? departure(row) : this.table === 'publications' ? publication(row) : row;
        let rows = tables[this.table].map(embed).filter(row => this.filters.every(filter => filter(row)));
        rows.sort((a, b) => { for (const [key, asc] of this.orders) {
          const x = path(a, key), y = path(b, key);
          if (x < y) return asc ? -1 : 1;
          if (x > y) return asc ? 1 : -1;
        } return 0; });
        rows = rows.slice(this.offset, this.end);
        if (this.values) {
          if (admin.failUpdate === this.table) return { data: null, error: new Error('Injected database failure') };
          const keys = Object.keys(this.values);
          for (const row of rows) {
            await db.query(`update public.${this.table} set ${keys.map((key, i) => `${key}=$${i + 1}`).join(',')} where id=$${keys.length + 1}`,
              [...Object.values(this.values), row.id]);
            Object.assign(row, this.values);
          }
        }
        return { data: this.singleRow ? rows[0] ?? null : rows, error: null };
      } catch (error) { return { data: null, error }; }
    }
  }
  const admin = {
    from: table => new Query(table),
    async rpc(name, args = {}) {
      try {
        if (name === 'mark_elapsed_reservations_past') {
          await db.query('select public.mark_elapsed_reservations_past()');
          return { data: null, error: null };
        }
        if (name === 'create_reservation') {
          const rows = (await db.query('select * from public.create_reservation($1,$2,$3)',
            [args.p_passenger_id, args.p_departure_id, args.p_number_of_people])).rows;
          return { data: rows[0], error: null };
        }
        if (name === 'cancel_departure_reservations') {
          return { data: (await db.query('select * from public.cancel_departure_reservations($1)', [args.p_departure_id])).rows, error: null };
        }
        throw new Error(`Unexpected RPC ${name}`);
      } catch (error) { return { data: null, error }; }
    },
  };
  async function reset() {
    admin.failUpdate = null;
    await db.exec('truncate reservations, profiles, agencies, publications, publication_departures cascade');
    for (const [key, role] of Object.entries({ traveler: 'Viajero', second: 'Viajero', owner: 'Agencia', outsider: 'Agencia', admin: 'Admin' })) {
      await db.query('insert into profiles(id,full_name,email) values($1,$2,$3)', [ids[key], `Prueba ${role}`, `${key}@example.invalid`]);
    }
    await db.query("insert into agencies(id,owner_user_id,email,status) values($1,$2,'agency@example.invalid','APPROVED')", [ids.agency, ids.owner]);
    await db.query("insert into publications(id,agency_id,title,price_per_person,status) values($1,$2,'Volcán Arenal',40,'APPROVED')", [ids.publication, ids.agency]);
    await db.query("insert into publication_departures(id,publication_id,start_at,capacity,status) values($1,$2,'2099-06-15T15:00:00Z',10,'ACTIVE')", [ids.departure, ids.publication]);
  }
  return { db, admin, reset };
}
