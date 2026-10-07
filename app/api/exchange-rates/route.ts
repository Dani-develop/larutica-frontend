import { proxyRemoteApiRequest } from '@/lib/api/remote-proxy';
import type { Rates } from '@/lib/preferences/format';
const TTL = 6 * 60 * 60 * 1000;
let cached: Rates | null = null;
let pending: Promise<Rates> | null = null;
async function fetchRates(): Promise<Rates> {
  const response = await fetch('https://api.frankfurter.dev/v2/rates?base=USD&quotes=CRC,EUR', {signal:AbortSignal.timeout(5000)});
  if (!response.ok) throw new Error('Exchange rate provider unavailable');
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) throw new Error('Invalid exchange rates');
  const rates = {USD:1,CRC:0,EUR:0};
  let date = '9999-99-99';
  for (const row of rows) {
    if (row.base !== 'USD' || !['CRC','EUR'].includes(row.quote) || !Number.isFinite(row.rate) || row.rate <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error('Invalid exchange rates');
    rates[row.quote as 'CRC'|'EUR'] = row.rate;
    if (row.date < date) date = row.date;
  }
  if (!rates.CRC || !rates.EUR || !Number.isFinite(Date.parse(date)) || Date.parse(date) > Date.now()+86400000 || Date.now() - Date.parse(date) > 7 * 86400000) throw new Error('Exchange rates missing or outdated');
  return {date,rates,fetchedAt:Date.now()};
}
export async function GET(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;
  try {
    if (!cached || Date.now() - cached.fetchedAt >= TTL) {
      pending ??= fetchRates();
      try { cached = await pending; } finally { pending = null; }
    }
    return Response.json({data:cached}, {headers:{'cache-control':'public, max-age=3600, s-maxage=21600'}});
  } catch {
    return Response.json({error:'No pudimos consultar el tipo de cambio. Los precios siguen disponibles en USD.'}, {status:503,headers:{'cache-control':'no-store'}});
  }
}
