'use client';
import {useCallback,useRef} from 'react';
import {confirmCheckoutPayment,startCheckoutPayment,type Checkout} from '@/modules/booking/checkout.service';
import {OnvoPaymentForm} from './OnvoPaymentForm';
export function CheckoutPayment({checkoutId,onResolved,onSubmitting}:{checkoutId:string;onResolved:(checkout:Checkout)=>void;onSubmitting?:(busy:boolean)=>void}) {
  const result=useRef<Checkout|null>(null);
  const start=useCallback(()=>startCheckoutPayment(checkoutId),[checkoutId]);
  const confirm=useCallback(async(id:string)=>{result.current=await confirmCheckoutPayment(checkoutId,id);const reservation=result.current.reservation;return !!reservation&&['CONFIRMED','PAST'].includes(reservation.status)&&reservation.paymentStatus==='PAID';},[checkoutId]);
  return <OnvoPaymentForm startKey={checkoutId} start={start} confirm={confirm} onSubmitting={onSubmitting} onPaid={()=>{if(result.current)onResolved(result.current);}}/>;
}
