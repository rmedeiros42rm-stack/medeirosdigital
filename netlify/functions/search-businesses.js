exports.handler = async function(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "{}" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Método não permitido." }) };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "GOOGLE_MAPS_API_KEY não configurada no Netlify." })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const segmento = body.segmento || body.category || "empresas";
    const cidade = body.cidade || body.city || "Recife";
    const estado = body.estado || body.state || "";
    const quantidade = Math.min(Number(body.quantidade || body.qtd || 20), 40);

    const busca = `${segmento} em ${cidade} ${estado}`.trim();

    const searchUrl =
      "https://maps.googleapis.com/maps/api/place/textsearch/json?query=" +
      encodeURIComponent(busca) +
      "&language=pt-BR&region=br&key=" +
      apiKey;

    const searchResp = await fetch(searchUrl);
    const searchData = await searchResp.json();

    if (!searchResp.ok || searchData.status === "REQUEST_DENIED") {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Erro na API do Google Maps.",
          details: searchData.error_message || searchData.status
        })
      };
    }

    const results = searchData.results || [];
    const empresas = [];

    for (const place of results.slice(0, quantidade)) {
      const detailsUrl =
        "https://maps.googleapis.com/maps/api/place/details/json?place_id=" +
        encodeURIComponent(place.place_id) +
        "&language=pt-BR&fields=name,formatted_address,formatted_phone_number,international_phone_number,website,url,business_status,types&key=" +
        apiKey;

      const detailsResp = await fetch(detailsUrl);
      const detailsData = await detailsResp.json();
      const d = detailsData.result || {};

      const temSite = !!d.website;

      if (!temSite) {
        empresas.push({
          empresa: d.name || place.name || "",
          segmento,
          cidade,
          estado,
          endereco: d.formatted_address || place.formatted_address || "",
          telefone: d.formatted_phone_number || d.international_phone_number || "",
          site: "",
          google_maps: d.url || "",
          status: "Sem site",
          place_id: place.place_id
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        busca,
        total_encontradas: results.length,
        sem_site: empresas.length,
        empresas
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Erro interno ao buscar empresas.",
        details: err.message
      })
    };
  }
};
