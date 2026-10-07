'use client';
import { useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { X, Check } from 'lucide-react';
import { usePreferences } from '@/lib/preferences/Preferences';
import type { Currency } from '@/lib/preferences/format';
function LanguageFlag({language}:{language:string}) {
  return <svg className="preference-flag" width="24" height="24" style={{width:24,height:24,minWidth:24,maxWidth:24,flexShrink:0,borderRadius:"50%",overflow:"hidden",display:"block"}} viewBox="0 0 30 20" aria-hidden="true" focusable="false">
    {language==='es'?<><rect width="30" height="20" fill="#002b7f"/><rect y="3.33" width="30" height="13.34" fill="white"/><rect y="6.67" width="30" height="6.66" fill="#ce1126"/></>:<><rect width="30" height="20" fill="white"/>{Array.from({length:7},(_,n)=><rect key={n} y={n*40/13} width="30" height={20/13} fill="#b22234"/>)}<rect width="13" height="10.77" fill="#3c3b6e"/>{Array.from({length:20},(_,n)=><circle key={n} cx={1.5+(n%5)*2.5} cy={1.5+Math.floor(n/5)*2.5} r=".5" fill="white"/>)}</>}
  </svg>;
}
export function PreferenceControls() {
  const {language,currency,setLanguage,setCurrency,rates,loadRates,rateLoading,rateError,t}=usePreferences();
  const [panel,setPanel]=useState<'language'|'currency'|null>(null);
  const trigger=useRef<HTMLButtonElement|null>(null);
  const currencies:{id:Currency;name:string}[]=[{id:'USD',name:'Dólar estadounidense'},{id:'CRC',name:'Colón costarricense'},{id:'EUR',name:'Euro'}];
  return <div className="preference-controls">
    <button type="button" className="preference-trigger" aria-label={`${t('Selecciona tu moneda')}: ${currency}`} title={t('Selecciona tu moneda')} onPointerEnter={()=>void loadRates()} onFocus={()=>void loadRates()} onClick={event=>{trigger.current=event.currentTarget;setPanel('currency');void loadRates();}}>{currency}</button>
    <button type="button" className="preference-trigger" aria-label={t('Selecciona tu idioma')} title={t('Selecciona tu idioma')} onClick={event=>{trigger.current=event.currentTarget;setPanel('language');}}><LanguageFlag language={language}/></button>
    <Dialog.Root open={panel!==null} onOpenChange={open=>{if(!open)setPanel(null);}}><Dialog.Portal><Dialog.Overlay className="preference-overlay"/><Dialog.Content className="preference-dialog" onCloseAutoFocus={event=>{event.preventDefault();trigger.current?.focus();}}>
      <Dialog.Title>{t(panel==='language'?'Selecciona tu idioma':'Selecciona tu moneda')}</Dialog.Title>
      <Dialog.Description>{t(panel==='language'?'Selecciona el idioma de la interfaz.':'Los precios convertidos son aproximados. El precio original y la reserva se mantienen en USD. No se realiza ningún cobro aquí.')}</Dialog.Description>
      <Dialog.Close className="preference-close" aria-label={t('Cerrar')}><X size={22}/></Dialog.Close>
      <div className="preference-options" role="radiogroup" aria-label={t(panel==='language'?'Idioma':'Moneda')}>
        {panel==='language'?[{id:'es' as const,name:'Español',flag:'🇨🇷'},{id:'en' as const,name:'English',flag:'🇺🇸'}].map(option=><label key={option.id} className="preference-option" data-selected={language===option.id}><input type="radio" name="language" checked={language===option.id} onChange={()=>{setLanguage(option.id);setPanel(null);}}/><LanguageFlag language={option.id}/><span lang={option.id}>{option.name}</span>{language===option.id&&<Check size={18} aria-hidden="true"/>}</label>):currencies.map(option=><label key={option.id} className="preference-option" data-selected={currency===option.id}><input type="radio" name="currency" aria-label={`${t(option.name)} (${option.id})`} checked={currency===option.id} disabled={option.id!=='USD'&&!rates} onChange={()=>{setCurrency(option.id);setPanel(null);}}/><span>{t(option.name)}<small>{option.id}</small></span>{currency===option.id&&<Check size={18} aria-hidden="true"/>}</label>)}
      </div>
      {panel==='currency'&&<div role="status" className="preference-rate-note">{rateLoading?t('Consultando tipos de cambio…'):rateError?<>{t('No pudimos consultar el tipo de cambio. Los precios siguen disponibles en USD.')} <button onClick={()=>void loadRates()}>{t('Volver a intentar')}</button></>:rates?<>{t('Tipo de cambio de referencia del')} {rates.date}. {t('Fuente: Frankfurter. La conversión puede variar al pagar.')}</>:null}</div>}
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
export function CurrencyNotice({usd}:{usd?:number}) {
  const {currency,rates,rateError,t}=usePreferences();
  if(currency==='USD')return null;
  return <p className="preference-rate-note" role="status">{rates?t('Conversión aproximada. La reserva conserva su precio en USD.'):t(rateError?'No pudimos consultar el tipo de cambio. Los precios siguen disponibles en USD.':'Consultando tipos de cambio…')}{usd!==undefined&&<> {t('Precio original:')} {new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',currencyDisplay:'code'}).format(usd)}.</>}</p>;
}
