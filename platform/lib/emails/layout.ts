// Carcasa compartida de los emails de Reconnect.iA. Misma estética marfil/tinta
// que lib/emails/welcome-formador.ts (tablas + estilos inline, email-safe), con
// el logo real de la plataforma en la cabecera y el pie de marca.
//
// Uso: emailLayout({ eyebrow, titulo, cuerpoHtml, cta })
// cuerpoHtml es HTML ya montado por el emisor (párrafos <p> con los estilos de
// abajo si quiere coherencia); el layout pone cabecera, card, CTA y pie.

const P_STYLE = 'style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#292724;"';

export function emailParagraph(html: string): string {
  return `<p ${P_STYLE}>${html}</p>`;
}

export function emailLayout({
  eyebrow,
  titulo,
  cuerpoHtml,
  cta,
  ctaSecundaria,
}: {
  eyebrow: string;
  titulo: string;
  cuerpoHtml: string;
  cta?: { label: string; href: string };
  ctaSecundaria?: { label: string; href: string };
}): string {
  const base = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const logoUrl = `${base}/reconnectia-logo.png`;

  const ctaHtml = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0">
        <tr><td>
          <a href="${cta.href}" style="display:inline-block;background:#161514;color:#F4F1EC;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;padding:16px 30px;border:1px solid #161514;box-shadow:0 4px 0 #161514;">${cta.label}</a>
        </td></tr>
      </table>`
    : "";

  const ctaSecHtml = ctaSecundaria
    ? `<p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#292724;">
        <a href="${ctaSecundaria.href}" style="color:#161514;font-weight:700;">${ctaSecundaria.label}</a>
      </p>`
    : "";

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${titulo}</title>
<style>
  @media (max-width: 600px) { .rcn-pad { padding: 24px !important; } }
</style>
</head>
<body style="margin:0;padding:0;background:#EAE6DF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EAE6DF;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#F4F1EC;border:1px solid #161514;box-shadow:0 6px 0 #161514;">
        <tr><td style="padding:24px 40px;border-bottom:1px solid #D6D2CA;">
          <img src="${logoUrl}" alt="Reconnect.iA" height="28" style="display:block;height:28px;max-width:220px;" />
        </td></tr>
        <tr><td class="rcn-pad" style="padding:40px;font-family:Arial,Helvetica,sans-serif;color:#292724;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8B867E;margin-bottom:14px;">${eyebrow}</div>
          <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;color:#161514;font-weight:700;">${titulo}</h1>
          ${cuerpoHtml}
          ${ctaHtml}
          ${ctaSecHtml}
        </td></tr>
        <tr><td style="padding:22px 40px;border-top:1px solid #D6D2CA;font-family:Arial,Helvetica,sans-serif;">
          <span style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8B867E;">© 2026 Reconnect.iA · Powered by CeSeA Sistemas</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
