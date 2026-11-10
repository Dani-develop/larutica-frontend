import { apiFetch } from '@/lib/api/browser-fetch';
import type { Reservation } from '@/modules/transport/reservations/services/reservation.service';
import type { StartedPayment } from '@/modules/payments/services/payment.service';
export type Checkout = {
  id:string;passengerId:string;departureId:string;numberOfPeople:number;unitPrice:number;total:number;
  departureStartAt:string;expiresAt:string;status:'ACTIVE'|'COMPLETED'|'EXPIRED'|'CANCELLED';
  publicationId:string;publicationTitle:string;destination:string|null;reservation:Reservation|null;
  paymentStatus:'UNPAID'|'PAID'|'REFUNDED';refundStatus:'pending'|'succeeded'|'failed'|null;
};
async function request<T>(path:string,method='GET',body?:unknown):Promise<T> {
  const response=await apiFetch(path,{method,cache:'no-store',credentials:'include',...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
  const payload=await response.json().catch(()=>null) as {data:T;error?:string}|null;
  if(!response.ok)throw new Error(payload?.error??'No pudimos consultar el estado de la compra.');
  if(!payload)throw new Error('La respuesta del servidor no es válida.');
  return payload.data;
}
export const findCheckout=(departureId:string)=>request<Checkout|null>(`/api/checkouts?departureId=${encodeURIComponent(departureId)}`);
export const createCheckout=(departureId:string,numberOfPeople:number)=>request<Checkout>('/api/checkouts','POST',{departureId,numberOfPeople});
export const getCheckout=(id:string)=>request<Checkout>(`/api/checkouts/${encodeURIComponent(id)}`);
export const reconcileCheckout=(id:string)=>request<Checkout>(`/api/checkouts/${encodeURIComponent(id)}`,'POST');
export const cancelCheckout=(id:string)=>request<Checkout>(`/api/checkouts/${encodeURIComponent(id)}`,'DELETE');
export const startCheckoutPayment=(id:string)=>request<StartedPayment>(`/api/checkouts/${encodeURIComponent(id)}/payment`,'POST');
export const confirmCheckoutPayment=(id:string,paymentIntentId:string)=>request<Checkout>(`/api/checkouts/${encodeURIComponent(id)}/payment/confirm`,'POST',{paymentIntentId});
