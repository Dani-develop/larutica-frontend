'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { currencyFormatter, dateFormatter, validRates, type Currency, type Language, type Rates } from './format';
import { english } from './messages';
const KEY = 'larutica.preferences.v1';
const RATE_KEY = 'larutica.exchange-rates.v1';
const TTL = 6 * 60 * 60 * 1000;
const defaults = {language:'es' as Language,currency:'USD' as Currency};
type Selection = typeof defaults;
const defaultValue = { ...defaults, rates:null as Rates|null, rateLoading:false, rateError:false,
  setLanguage:(_value:Language)=>{void _value;}, setCurrency:(_value:Currency)=>{void _value;}, loadRates:()=>Promise.resolve(),
  t:(text:string)=>text, money:currencyFormatter('es','USD',null), dateLabel:dateFormatter('es') };
const Context = createContext(defaultValue);
function readSelection(): Selection {
  try { const value = JSON.parse(localStorage.getItem(KEY) ?? '{}'); return {
    language:value.language === 'en' ? 'en' : 'es',
    currency:['USD','CRC','EUR'].includes(value.currency) ? value.currency : 'USD',
  }; } catch { return defaults; }
}
export function PreferencesProvider({children}:{children:ReactNode}) {
  const [selection,setSelection] = useState<Selection>(defaults);
  const [rates,setRates] = useState<Rates|null>(null);
  const [rateLoading,setRateLoading] = useState(false), [rateError,setRateError] = useState(false);
  const currentRates = useRef<Rates|null>(null), pending = useRef<Promise<void>|null>(null);
  const loadRates = useCallback(():Promise<void> => {
    if (currentRates.current && Date.now() - currentRates.current.fetchedAt < TTL) return Promise.resolve();
    if (pending.current) return pending.current;
    setRateLoading(true); setRateError(false);
    const request = fetch('/api/exchange-rates').then(async response => {
      const body = await response.json() as {data?:unknown};
      if (!response.ok || !validRates(body.data)) throw new Error('Rates unavailable');
      currentRates.current = body.data; setRates(body.data);
      try { localStorage.setItem(RATE_KEY,JSON.stringify(body.data)); } catch { /* Storage may be unavailable. */ }
    }).catch(()=>setRateError(true)).finally(()=>{pending.current=null;setRateLoading(false);});
    pending.current = request;
    return request;
  },[]);
  useEffect(()=>{
    let active = true;
    queueMicrotask(()=>{
      if (!active) return;
      const saved = readSelection(); setSelection(saved);
      try { const previous = JSON.parse(localStorage.getItem(RATE_KEY) ?? 'null');
        if (validRates(previous) && Date.now()-previous.fetchedAt < TTL) {currentRates.current=previous;setRates(previous);}
      } catch { /* Invalid cache is ignored. */ }
      if (saved.currency !== 'USD') void loadRates();
    });
    const sync = (event:StorageEvent) => {if(event.key===KEY) setSelection(readSelection());};
    window.addEventListener('storage',sync);
    return ()=>{active=false;window.removeEventListener('storage',sync);};
  },[loadRates]);
  useEffect(()=>{document.documentElement.lang=selection.language;if(selection.currency!=='USD') void loadRates();},[selection,loadRates]);
  const update = useCallback((change:Partial<Selection>)=>{
    const next={...selection,...change};
    setSelection(next);
    try {localStorage.setItem(KEY,JSON.stringify(next));}catch {/* Changes still work for this visit. */}
  },[selection]);
  const value = useMemo(()=>({...selection,rates,rateLoading,rateError,
    setLanguage:(language:Language)=>update({language}),setCurrency:(currency:Currency)=>update({currency}),loadRates,
    t:(text:string)=>selection.language==='en' ? (english[text.trim()] ? text.replace(text.trim(),english[text.trim()]) : text) : text,
    money:currencyFormatter(selection.language,selection.currency,rates),dateLabel:dateFormatter(selection.language),
  }),[selection,rates,rateLoading,rateError,loadRates,update]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const usePreferences = ()=>useContext(Context);
