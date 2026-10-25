export const MAIL_LOGO_CID = "larutica-logo";

const forest = "#003b22";
const accent = "#00df5b";
const surface = "#ffffff";
const muted = "#f2f4f2";
const secondary = "#455349";
const meta = "#647266";
const stroke = "#d9e1dc";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderBrandedMail(input: {
  heading: string;
  paragraphs: string[];
  facts?: Array<[string, string]>;
}) {
  const facts = input.facts ?? [];
  const preheader = escapeHtml(input.paragraphs[0] || input.heading);
  const paragraphs = input.paragraphs.map((paragraph) =>
    `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${secondary};">${escapeHtml(paragraph)}</p>`,
  ).join("");
  const factRows = facts.map(([label, value]) => `
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid ${stroke};font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${meta};vertical-align:top;width:46%;">${escapeHtml(label)}</td>
                <td style="padding:12px 0;border-bottom:1px solid ${stroke};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:1.4;color:${forest};vertical-align:top;">${escapeHtml(value)}</td>
              </tr>`).join("");
  const factsTable = factRows
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;border-top:1px solid ${stroke};">${factRows}</table>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(input.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${muted};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${muted};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${surface};border:1px solid ${stroke};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:${forest};padding:0;height:6px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="height:6px;background:${accent};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="background:${forest};padding:24px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="cid:${MAIL_LOGO_CID}" width="48" height="48" alt="LaRutica" style="display:block;border:0;border-radius:12px;width:48px;height:48px;">
                  </td>
                  <td style="padding-left:14px;vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;line-height:1.2;letter-spacing:-.03em;color:${surface};">LaRutica</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 12px;">
              <h1 style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;line-height:1.3;color:${forest};">${escapeHtml(input.heading)}</h1>
              ${paragraphs}
              ${factsTable}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${meta};">Este mensaje lo envía LaRutica. Si no lo esperabas, puedes ignorarlo.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
