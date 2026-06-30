exports.handler = async function(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Content-Type": "application/json; charset=utf-8"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "{}" };

  if (event.httpMethod === "GET") {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, message: "Função search-businesses online. Use POST para buscar empresas reais no Google Maps." }) };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Método não permitido." }) };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "GOOGLE_MAPS_API_KEY não configurada no Netlify." }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const segmento = String(body.segmento || body.category || "empresas").trim();
    const cidade = String(body.cidade || body.city || "Recife").trim();
    const estado = String(body.estado || body.state || "PE").trim();
    const quantidade = Math.max(1, Math.min(Number(body.quantidade || body.qtd || 12), 50));
    const busca = `${segmento} em ${cidade} ${estado}`.trim();

    const googleResp = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.nationalPhoneNumber",
          "places.internationalPhoneNumber",
          "places.websiteUri",
          "places.googleMapsUri",
          "places.businessStatus",
          "places.types"
        ].join(",")
      },
      body: JSON.stringify({
        textQuery: busca,
        languageCode: "pt-BR",
        regionCode: "BR",
        maxResultCount: quantidade
      })
    });

    const data = await googleResp.json().catch(() => ({}));

    if (!googleResp.ok) {
      return {
        statusCode: googleResp.status,
        headers,
        body: JSON.stringify({
          error: "Erro na Places API.",
          details: data.error?.message || data
        })
      };
    }

    const places = Array.isArray(data.places) ? data.places : [];

    const todas = places.map((p) => {
      const site = p.websiteUri || "";
      const nome = p.displayName?.text || "";
      return {
        empresa: nome,
        segmento,
        cidade,
        estado,
        endereco: p.formattedAddress || "",
        telefone: p.nationalPhoneNumber || p.internationalPhoneNumber || "",
        email: "",
        instagram: "",
        site,
        google_maps: p.googleMapsUri || "",
        status: site ? "Com site" : "Sem site",
        place_id: p.id || "",
        origem: "Google Maps"
      };
    });

    const empresas = todas.filter(e => !e.site);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        busca,
        total_encontradas: places.length,
        sem_site: empresas.length,
        observacao: "O Google Maps/Places não fornece e-mails públicos. Use telefone/WhatsApp ou importe e-mails por CSV/TXT no painel.",
        empresas
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Erro interno ao buscar empresas.", details: err.message })
    };
  }
};