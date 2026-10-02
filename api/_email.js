const { Resend } = require('resend');

const TICKET_TYPE_LABELS = {
  general: 'GENERAL ACCESS',
  vip: 'VIP ACCESS',
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCodesHtml(codes) {
  return codes
    .map(
      (code) =>
        `<p style="margin:0 0 14px;font-size:24px;font-weight:600;letter-spacing:5px;` +
        `color:#B08A50;font-family:'Courier New',Courier,monospace;line-height:1;">${escapeHtml(code)}</p>`
    )
    .join('');
}

function buildEmailHtml({ attendeeName, ticketType, codes }) {
  const typeLabel = TICKET_TYPE_LABELS[ticketType] || ticketType.toUpperCase();
  const codesHtml = buildCodesHtml(codes);
  const name = escapeHtml(attendeeName || 'Asistente');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Tu acceso — ¿Quién Mató a La Nena?</title>
</head>
<body style="margin:0;padding:0;background-color:#09080a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09080a;">
  <tr>
    <td align="center" style="padding:48px 20px 64px;">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">

        <!-- Brand -->
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <p style="margin:0;font-size:8px;letter-spacing:8px;text-transform:uppercase;color:rgba(176,138,80,0.72);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">VERANO DESERT®</p>
          </td>
        </tr>

        <!-- Rule -->
        <tr>
          <td style="padding-bottom:36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height:1px;background-color:rgba(122,92,66,0.24);"></td></tr>
            </table>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding-bottom:6px;">
            <p style="margin:0;font-size:13px;letter-spacing:1px;color:rgba(232,226,217,0.50);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Hola ${name},</p>
          </td>
        </tr>

        <!-- Headline -->
        <tr>
          <td style="padding-bottom:36px;">
            <p style="margin:0;font-size:26px;font-weight:500;letter-spacing:0px;color:#f0e9db;line-height:1.3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Tu acceso está confirmado.</p>
          </td>
        </tr>

        <!-- Event details card -->
        <tr>
          <td style="padding-bottom:24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:1px solid rgba(122,92,66,0.22);border-radius:3px;">
              <tr>
                <td style="padding:24px 28px;">

                  <p style="margin:0 0 3px;font-size:7px;letter-spacing:6px;text-transform:uppercase;color:rgba(176,138,80,0.65);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">EVENTO</p>
                  <p style="margin:0 0 20px;font-size:15px;font-weight:500;letter-spacing:1px;color:#f0e9db;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">¿QUIÉN MATÓ A LA NENA?</p>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                    <tr><td style="height:1px;background-color:rgba(122,92,66,0.15);"></td></tr>
                  </table>

                  <p style="margin:0 0 4px;font-size:7px;letter-spacing:5px;text-transform:uppercase;color:rgba(232,226,217,0.35);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">FECHA Y LUGAR</p>
                  <p style="margin:0 0 20px;font-size:12px;letter-spacing:1px;color:rgba(232,226,217,0.65);line-height:1.65;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                    31 de octubre de 2026<br>
                    Punta Cana &nbsp;&middot;&nbsp; 9:00 PM &mdash; till late
                  </p>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                    <tr><td style="height:1px;background-color:rgba(122,92,66,0.15);"></td></tr>
                  </table>

                  <p style="margin:0 0 4px;font-size:7px;letter-spacing:5px;text-transform:uppercase;color:rgba(232,226,217,0.35);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">TIPO DE ACCESO</p>
                  <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#B08A50;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${typeLabel}</p>

                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Codes card -->
        <tr>
          <td style="padding-bottom:32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:1px solid rgba(176,138,80,0.22);border-radius:3px;background-color:rgba(176,138,80,0.04);">
              <tr>
                <td style="padding:24px 28px;">

                  <p style="margin:0 0 20px;font-size:7px;letter-spacing:6px;text-transform:uppercase;color:rgba(176,138,80,0.65);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">CÓDIGO(S) DE ACCESO</p>

                  ${codesHtml}

                  <p style="margin:16px 0 0;font-size:10px;letter-spacing:1px;color:rgba(232,226,217,0.32);line-height:1.65;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                    Presenta este código junto con tu nombre en la entrada.
                  </p>

                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Rule -->
        <tr>
          <td style="padding-bottom:24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height:1px;background-color:rgba(122,92,66,0.18);"></td></tr>
            </table>
          </td>
        </tr>

        <!-- Dress code -->
        <tr>
          <td style="padding-bottom:32px;">
            <p style="margin:0 0 3px;font-size:7px;letter-spacing:5px;text-transform:uppercase;color:rgba(176,138,80,0.58);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">DRESS CODE</p>
            <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(232,226,217,0.52);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">GATSBY CRIME &mdash; obligatorio.</p>
          </td>
        </tr>

        <!-- Fine print -->
        <tr>
          <td style="padding-bottom:36px;">
            <p style="margin:0;font-size:10px;letter-spacing:1px;color:rgba(232,226,217,0.28);line-height:1.7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
              Los códigos son únicos y serán validados al ingresar.
            </p>
          </td>
        </tr>

        <!-- Sign off -->
        <tr>
          <td>
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:1px;color:rgba(232,226,217,0.38);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">See you inside the case.</p>
            <p style="margin:0;font-size:8px;letter-spacing:5px;text-transform:uppercase;color:rgba(176,138,80,0.62);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">VERANO DESERT®</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`;
}

async function sendTicketEmail({ to, attendeeName, ticketType, codes }) {
  if (!to) {
    console.warn('sendTicketEmail: no recipient address — skipping.');
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured.');
  }

  const from = process.env.TICKETS_FROM_EMAIL;
  if (!from) {
    throw new Error('TICKETS_FROM_EMAIL not configured.');
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to,
    subject: 'Tu acceso a ¿QUIÉN MATÓ A LA NENA?',
    html: buildEmailHtml({ attendeeName, ticketType, codes }),
  });
}

module.exports = { sendTicketEmail };
