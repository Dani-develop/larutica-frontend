import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from '@/lib/api/errors';
import { getReservationRecordsByIds, toPublicReservation } from './repository';

export function managementFilters(url: URL) {
  const params = url.searchParams;
  const page = Number(params.get('page') ?? 1);
  const search = (params.get('search') ?? '').trim();
  const period = params.get('period') ?? 'upcoming';
  const status = params.get('status') ?? '';
  const publicationId = params.get('publicationId');
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || search.length > 100
    || !['upcoming','history','all'].includes(period) || !['','CONFIRMED','PAST','CANCELLED'].includes(status)
    || (publicationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(publicationId))) {
    throw new ApiError('Los filtros de reservas no son válidos.',400);
  }
  return {page,search,period,status,publicationId,archived:params.get('archived')==='1'};
}

export async function reservationManagement(admin: SupabaseClient, role: string, userId: string, url: URL) {
  if (!['Admin','Agencia','Transporte'].includes(role)) throw new ApiError('No tienes acceso a la administración de reservas.',403);
  const filters = managementFilters(url);
  const owner = role === 'Admin' ? null : userId;
  const common = {p_owner:owner,p_page:filters.page,p_search:filters.search};
  if (!filters.publicationId) {
    const {data,error} = await admin.rpc('reservation_publications_page',{...common,p_size:12,p_archived:filters.archived});
    if (error) throw error;
    return data;
  }
  const {data,error} = await admin.rpc('publication_reservations_page',{...common,p_size:10,p_publication:filters.publicationId,p_period:filters.period,p_status:filters.status});
  if (error) {
    if(error.code==='P0002')throw new ApiError('La publicación no está disponible.',404);
    throw error;
  }
  const items = data.items as {id:string;status:'CONFIRMED'|'PAST'|'CANCELLED'}[];
  const records = await getReservationRecordsByIds(admin,items.map(item=>item.id));
  const byId = new Map(records.map(record=>[record.id,record]));
  return {...data,items:undefined,data:items.flatMap(item=>{const record=byId.get(item.id);return record?[{...toPublicReservation(record),status:item.status}]:[];})};
}
