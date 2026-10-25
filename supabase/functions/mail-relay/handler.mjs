const reply = (body, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
const email = value => typeof value === 'string' && value.length < 255 && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
const failure = error => ({ status: 'failed', code: typeof error?.code === 'string' && /^[A-Z0-9_]+$/.test(error.code) ? error.code : 'SMTP_SEND_FAILED',
  ...(typeof error?.command === 'string' && /^[A-Z0-9 _-]+$/.test(error.command) ? { command: error.command } : {}),
  ...(Number.isInteger(error?.responseCode) ? { responseCode: error.responseCode } : {}) });

/** Server-to-server relay. Only a SHA-256 token fingerprint is stored in source.
 * SMTP credentials arrive over authenticated HTTPS and are never persisted.
 */
export function createMailRelay({ tokenHash, createTransport }) {
  return async request => {
    const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
    if (token.length < 32 || token.length > 256 || !/^[a-f0-9]{64}$/.test(tokenHash)) return reply({ error: 'Unauthorized' }, 401);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
    const expected = Uint8Array.from(tokenHash.match(/../g), byte => parseInt(byte, 16));
    if (digest.reduce((difference, byte, index) => difference | (byte ^ expected[index]), 0)) return reply({ error: 'Unauthorized' }, 401);
    if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: 'Invalid body' }, 400);
    let raw = '', size = 0;
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > 65536) { await reader.cancel(); return reply({ error: 'Body too large' }, 413); }
        raw += decoder.decode(chunk.value, { stream: true });
      }
      raw += decoder.decode();
    } catch { return reply({ error: 'Invalid body' }, 400); }
    let body;
    try { body = JSON.parse(raw); } catch { return reply({ error: 'Invalid JSON' }, 400); }
    if (!body || !['verify', 'send'].includes(body.operation) || body.smtp?.user !== 'aguero2609@gmail.com'
      || typeof body.smtp?.pass !== 'string' || !body.smtp.pass.trim() || body.smtp.pass.length > 256) return reply({ error: 'Invalid configuration' }, 400);
    const message = body.message;
    const logoOk = message?.inlineLogo == null || (typeof message.inlineLogo === 'string'
      && message.inlineLogo.length <= 20000 && /^[A-Za-z0-9+/]+={0,2}$/.test(message.inlineLogo));
    if (body.operation === 'send' && (!email(message?.to) || typeof message?.subject !== 'string'
      || !message.subject || message.subject.length > 500 || /[\r\n]/.test(message.subject)
      || typeof message?.text !== 'string' || message.text.length > 40000
      || (message.html != null && (typeof message.html !== 'string' || message.html.length > 40000))
      || !logoOk)) return reply({ error: 'Invalid message' }, 400);
    const transport = createTransport({ host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: body.smtp.user, pass: body.smtp.pass }, connectionTimeout: 10000, greetingTimeout: 10000,
      socketTimeout: 15000, disableFileAccess: true, disableUrlAccess: true });
    try {
      if (body.operation === 'verify') { await transport.verify(); return reply({ verified: true }); }
      const html = typeof message.html === 'string' ? message.html : '';
      const info = await transport.sendMail({
        from: 'LaRutica <aguero2609@gmail.com>', to: message.to, subject: message.subject, text: message.text,
        ...(html ? { html } : {}),
        ...(html && message.inlineLogo ? { attachments: [{
          filename: 'larutica-logo.png',
          content: Uint8Array.from(atob(message.inlineLogo), char => char.charCodeAt(0)),
          cid: 'larutica-logo', contentType: 'image/png', contentDisposition: 'inline',
        }] } : {}),
      });
      if (!info?.accepted?.length || info.rejected?.length) return reply({ result: { status: 'failed', code: 'SMTP_RECIPIENT_REJECTED' } }, 502);
      return reply({ result: { status: 'sent', messageId: info.messageId } });
    } catch (error) { return reply({ result: failure(error) }, 502); }
    finally { transport.close(); }
  };
}
