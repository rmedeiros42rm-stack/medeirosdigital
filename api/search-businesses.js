export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).json({});
  if (req.method === "GET") return res.status(200).json({ ok: true, message: "Função online na Vercel." });
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY não configurada na Vercel." });

  try {
    const body = req.body || {};
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
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.businessStatus,places.types"
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
      return res.status(googleResp.status).json({
        error: "Erro na Places API.",
        details: data.error?.message || data
      });
    }

    const places = Array.isArray(data.places) ? data.places : [];

    const todas = places.map((p) => {
      const site = p.websiteUri || "";
      return {
        empresa: p.displayName?.text || "",
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

    return res.status(200).json({
      ok: true,
      busca,
      total_encontradas: places.length,
      sem_site: empresas.length,
      observacao: "O Google Maps/Places não fornece e-mails públicos.",
      empresas
    });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno ao buscar empresas.", details: err.message });
  }
}        "X-Goog-FieldMask": [
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
