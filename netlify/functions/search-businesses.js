exports.handler = async function(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Content-Type": "application/json; charset=utf-8"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "{}" };
  }

  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: "Função search-businesses online. Use POST para buscar empresas."
      })
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Método não permitido." })
    };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "GOOGLE_MAPS_API_KEY não configurada no Netlify."
      })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const segmento = body.segmento || body.category || "empresas";
    const cidade = body.cidade || body.city || "Recife";
    const estado = body.estado || body.state || "";
    const quantidade = Math.min(Number(body.quantidade || body.qtd || 10), 20);

    const busca = `${segmento} em ${cidade} ${estado}`.trim();

    const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
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

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        headers,
        body: JSON.stringify({
          error: "Erro na Places API (New).",
          details: data.error?.message || data
        })
      };
    }

    const places = data.places || [];

    const empresas = places
      .map((p) => {
        const nome = p.displayName?.text || "";
        const site = p.websiteUri || "";

        return {
          empresa: nome,
          segmento,
          cidade,
          estado,
          endereco: p.formattedAddress || "",
          telefone: p.nationalPhoneNumber || p.internationalPhoneNumber || "",
          site,
          google_maps: p.googleMapsUri || "",
          status: site ? "Com site" : "Sem site",
          place_id: p.id || ""
        };
      })
      .filter((e) => !e.site);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        busca,
        total_encontradas: places.length,
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
