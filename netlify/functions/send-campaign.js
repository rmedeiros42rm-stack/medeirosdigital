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
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'RESEND_API_KEY não configurada.' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { emails, subject, html, from } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Lista de e-mails inválida.' })
      };
    }

    const results = [];

    for (const email of emails) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: from || 'Medeiros Digital <onboarding@resend.dev>',
          to: email,
          subject,
          html
        })
      });

      const data = await response.json();

      results.push({
        email,
        status: response.status,
        data
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sent: results.length,
        results
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err.message
      })
    };
  }
};
