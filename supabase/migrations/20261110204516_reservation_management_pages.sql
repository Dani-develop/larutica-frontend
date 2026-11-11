-- Bounded management queries. Ownership is supplied by the authenticated API,
-- never by the browser. Only service_role may execute these functions.
create or replace function public.reservation_publications_page(
  p_owner uuid, p_page integer, p_size integer, p_search text, p_archived boolean
) returns jsonb language sql stable set search_path = public, pg_temp as $$
  with eligible as (
    select p.id, p.title, p.destination, p.main_image_url, p.status,
      a.commercial_name as agency_name
    from public.publications p join public.agencies a on a.id=p.agency_id
    where (p_owner is null or a.owner_user_id=p_owner)
      and case when p_archived then p.status<>'APPROVED' and exists (
        select 1 from public.publication_departures d join public.reservations r on r.departure_id=d.id
        where d.publication_id=p.id and r.status<>'PENDING' and exists (
          select 1 from public.reservation_payments pay where pay.reservation_id=r.id and pay.status in ('paid','refunded'))
      ) else p.status='APPROVED' end
      and (coalesce(p_search,'')='' or position(lower(p_search) in lower(concat_ws(' ',p.title,p.destination,a.commercial_name)))>0)
  ), metadata as (
    select count(*)::integer total, greatest(1,least(greatest(1,p_page),ceil(count(*)::numeric/greatest(1,least(50,p_size)))::integer)) page,
      greatest(1,least(50,p_size)) size from eligible
  ), selected as (
    select e.* from eligible e order by lower(e.title),e.id
    limit (select size from metadata) offset (select (page-1)*size from metadata)
  ), cards as (
    select s.*, stats.total_reservations, stats.upcoming_reservations from selected s
    cross join lateral (
      select count(*)::integer total_reservations,
        count(*) filter(where r.status='CONFIRMED' and d.status='ACTIVE' and coalesce(r.departure_start_at_snapshot,d.start_at)>now())::integer upcoming_reservations
      from public.publication_departures d join public.reservations r on r.departure_id=d.id
      where d.publication_id=s.id and r.status<>'PENDING'
        and exists(select 1 from public.reservation_payments pay where pay.reservation_id=r.id and pay.status in ('paid','refunded'))
    ) stats
  ) select jsonb_build_object('data',coalesce((select jsonb_agg(jsonb_build_object(
    'id',id,'title',title,'destination',destination,'imageUrl',main_image_url,'status',status,
    'agencyName',agency_name,'totalReservations',total_reservations,'upcomingReservations',upcoming_reservations
  ) order by lower(title),id) from cards),'[]'::jsonb),'total',total,'page',page,'pageSize',size) from metadata;
$$;

create or replace function public.publication_reservations_page(
  p_owner uuid,p_publication uuid,p_page integer,p_size integer,p_search text,p_period text,p_status text
) returns jsonb language plpgsql stable set search_path = public, pg_temp as $$
declare v_publication jsonb; v_result jsonb;
begin
  select jsonb_build_object('id',p.id,'title',p.title,'destination',p.destination,'agencyName',a.commercial_name,'status',p.status)
    into v_publication from public.publications p join public.agencies a on a.id=p.agency_id
    where p.id=p_publication and (p_owner is null or a.owner_user_id=p_owner);
  if v_publication is null then raise exception 'La publicación no está disponible.' using errcode='P0002'; end if;
  with source as (
    select r.id,r.created_at,coalesce(r.departure_start_at_snapshot,d.start_at) as departure_at,
      case when r.status='CONFIRMED' and coalesce(r.departure_start_at_snapshot,d.start_at)<=now() then 'PAST' else r.status end as status,
      r.status='CONFIRMED' and d.status='ACTIVE' and coalesce(r.departure_start_at_snapshot,d.start_at)>now() as upcoming
    from public.reservations r join public.publication_departures d on d.id=r.departure_id
    left join public.profiles passenger on passenger.id=r.passenger_id
    where d.publication_id=p_publication and r.status<>'PENDING'
      and exists(select 1 from public.reservation_payments pay where pay.reservation_id=r.id and pay.status in ('paid','refunded'))
      and (coalesce(p_search,'')='' or position(lower(p_search) in lower(concat_ws(' ',r.id::text,passenger.full_name,passenger.email,passenger.phone)))>0)
  ), filtered as (
    select * from source where (p_period='all' or (p_period='upcoming' and upcoming) or (p_period='history' and not upcoming))
      and (coalesce(p_status,'')='' or status=p_status)
  ), metadata as (
    select count(*)::integer total, greatest(1,least(greatest(1,p_page),ceil(count(*)::numeric/greatest(1,least(50,p_size)))::integer)) page,
      greatest(1,least(50,p_size)) size from filtered
  ), selected as (
    select * from filtered order by case when p_period='upcoming' then departure_at end asc,created_at desc,id
      limit (select size from metadata) offset (select (page-1)*size from metadata)
  ) select jsonb_build_object('publication',v_publication,'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'status',status)
    order by case when p_period='upcoming' then departure_at end asc,created_at desc,id) from selected),'[]'::jsonb),
    'total',total,'page',page,'pageSize',size) into v_result from metadata;
  return v_result;
end;
$$;
revoke all on function public.reservation_publications_page(uuid,integer,integer,text,boolean) from public,anon,authenticated;
revoke all on function public.publication_reservations_page(uuid,uuid,integer,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.reservation_publications_page(uuid,integer,integer,text,boolean) to service_role;
grant execute on function public.publication_reservations_page(uuid,uuid,integer,integer,text,text,text) to service_role;
