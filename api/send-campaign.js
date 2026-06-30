module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") return res.status(200).json({});

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "Função send-campaign online na Vercel. Use POST para enviar e-mails."
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const apiKey = process.env.RESEND_API_KEY || process.env.RESEND_API;
  console.log("send-campaign chamada", { method: req.method, hasResendKey: Boolean(apiKey) });
  if (!apiKey) {
    return res.status(500).json({ error: "RESEND_API_KEY ou RESEND_API não configurada na Vercel." });
  }

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const subject = String(data.subject || data.assunto || "").trim();
    const message = String(data.message || data.mensagem || "").trim();
    const recipientsRaw = Array.isArray(data.recipients) ? data.recipients : [];
    const from = String(data.from || process.env.RESEND_FROM_EMAIL || "Medeiros Digital <contato@medeirosdigital.com>").trim();

    const recipients = recipientsRaw
      .map(r => typeof r === "string" ? { email: r, empresa: "" } : r)
      .map(r => ({
        email: String(r.email || "").trim().toLowerCase(),
        empresa: String(r.empresa || r.nome || "sua empresa").trim()
      }))
      .filter(r => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));

    if (!subject) return res.status(400).json({ error: "Assunto obrigatório." });
    if (!message) return res.status(400).json({ error: "Mensagem obrigatória." });
    if (!recipients.length) return res.status(400).json({ error: "Nenhum e-mail válido informado." });

    let sent = 0;
    let failed = 0;
    const results = [];

    for (const r of recipients) {
      const personalized = message
        .replaceAll("{{empresa}}", r.empresa || "sua empresa")
        .replaceAll("[LINK_DO_SITE]", "https://medeirosdigital.com");

      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;font-size:15px">
          ${personalized.split("\n").map(line => `<p>${escapeHtml(line) || "&nbsp;"}</p>`).join("")}
          <hr style="border:0;border-top:1px solid #e5e7eb;margin:22px 0">
          <p style="color:#6b7280;font-size:12px">
            Medeiros Digital<br>
            Você recebeu este contato porque seu e-mail foi informado ou consta publicamente como contato comercial.
          </p>
        </div>`;

      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from,
            to: [r.email],
            subject,
            html
          })
        });
        const result = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          failed++;
          results.push({ email: r.email, ok: false, error: result.message || result.error || result });
        } else {
          sent++;
          results.push({ email: r.email, ok: true, id: result.id || "" });
        }
      } catch (err) {
        failed++;
        results.push({ email: r.email, ok: false, error: err.message });
      }
    }

    return res.status(200).json({ ok: true, sent, failed, results });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno ao enviar campanha.", details: err.message });
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
