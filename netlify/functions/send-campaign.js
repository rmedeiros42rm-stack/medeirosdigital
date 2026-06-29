exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'RESEND_API_KEY não configurada' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    const subject = body.subject || 'Mensagem da Medeiros Digital';
    const message = body.message || body.html || '';
    const recipients = Array.isArray(body.recipients) ? body.recipients : [];

    const emails = recipients
      .map(r => typeof r === 'string' ? r : r.email)
      .filter(Boolean);

    if (!emails.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nenhum e-mail recebido' }) };
    }

    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Medeiros Digital <onboarding@resend.dev>',
          to: [email],
          subject,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${String(message).replace(/\n/g, '<br>')}</div>`
        })
      });

      if (resp.ok) sent++;
      else failed++;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        sent,
        delivered: sent,
        failed
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Erro interno' })
    };
  }
};
