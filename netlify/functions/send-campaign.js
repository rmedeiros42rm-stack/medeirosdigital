exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '{}' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido.' }) };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'RESEND_API_KEY não configurada no Netlify.' }) };

  let data;
  try { data = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido.' }) }; }

  const subject = String(data.subject || '').trim();
  const message = String(data.message || '').trim();
  const recipients = Array.isArray(data.recipients) ? data.recipients : [];

  const cleanRecipients = recipients
    .map(r => ({ email: String(r.email || '').trim().toLowerCase(), name: String(r.empresa || r.nome || '').trim() }))
    .filter(r => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));

  const unique = [];
  const seen = new Set();
  for (const r of cleanRecipients) {
    if (!seen.has(r.email)) {
      seen.add(r.email);
      unique.push(r);
    }
  }

  if (!subject || !message)
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Assunto e mensagem são obrigatórios.' })
    };

  if (!unique.length)
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Nenhum e-mail válido encontrado.' })
    };

  if (unique.length > 200)
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Limite de 200 destinatários por envio.' })
    };

  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const r of unique) {
    const htmlMessage = message
      .replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[c]))
      .replace(/\n/g, '<br>');

    const payload = {
      from: 'Medeiros Digital <contato@medeirosdigital.com>',
      to: [r.email],
      subject,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111"><p>${htmlMessage}</p><hr><p style="font-size:12px;color:#666">Medeiros Digital<br>Você recebeu este contato porque seu e-mail foi informado ou consta publicamente como contato comercial.</p></div>`,
      text: message + '\n\nMedeiros Digital'
    };

    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const body = await resp.text();
        failed++;
        errors.push({
          email: r.email,
          error: body.slice(0, 250)
        });
      } else {
        sent++;
      }
    } catch (err) {
      failed++;
      errors.push({
        email: r.email,
        error: String(err.message || err).slice(0, 250)
      });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      total: unique.length,
      sent,
      failed,
      errors: errors.slice(0, 10)
    })
  };
};
