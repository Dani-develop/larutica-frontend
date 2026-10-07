export type Language = 'es' | 'en';
export type Currency = 'USD' | 'CRC' | 'EUR';
export type Rates = { date: string; rates: Record<Currency, number>; fetchedAt: number };
export const localeFor = (language: Language) => language === 'en' ? 'en-US' : 'es-CR';
export function validRates(value: unknown): value is Rates {
  if (!value || typeof value !== 'object') return false;
  const r = value as Rates;
  return typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date)
    && Number.isFinite(Date.parse(r.date)) && Date.now()-Date.parse(r.date) < 7*86400000 && Date.parse(r.date) <= Date.now()+86400000
    && r.fetchedAt > 0 && Number.isFinite(r.fetchedAt) && r.fetchedAt <= Date.now() + 60_000
    && !!r.rates && r.rates.USD === 1 && ['CRC', 'EUR'].every(c => Number.isFinite(r.rates[c as Currency]) && r.rates[c as Currency] > 0);
}
export function currencyFormatter(language: Language, currency: Currency, rates: Rates | null) {
  const effective = currency !== 'USD' && !rates ? 'USD' : currency;
  const formatter = new Intl.NumberFormat(localeFor(language), {style:'currency',currency:effective,currencyDisplay:'code',maximumFractionDigits:2});
  return (usd: number) => `${effective === 'USD' ? '' : '≈ '}${formatter.format(usd * (rates?.rates[effective] ?? 1))}`;
}
export function dateFormatter(language: Language) {
  const formatter = new Intl.DateTimeFormat(localeFor(language), {dateStyle:'medium',timeStyle:'short',timeZone:'America/Costa_Rica'});
  return (iso: string) => formatter.format(new Date(iso));
}
