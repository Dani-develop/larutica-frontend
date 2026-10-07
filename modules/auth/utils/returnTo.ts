// Allow only public booking destinations, never arbitrary external redirects.
export function safeBookingReturn(value: string | null): string {
  if (!value || /[\\\r\n]/.test(value)) return '/dashboard';
  try {
    const url = new URL(value, 'https://larutica.invalid');
    if (url.origin !== 'https://larutica.invalid') return '/dashboard';
    if (url.pathname !== '/mis-reservas' && !/^\/experiencias\/[0-9a-f-]{36}$/i.test(url.pathname)) return '/dashboard';
    return `${url.pathname}${url.search}`;
  } catch { return '/dashboard'; }
}
