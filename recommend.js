const catalog = require("../catalog.json");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Clé API non configurée sur le serveur." });
    return;
  }

  const { occasion, type, budget, sensibilite, freeText } = req.body || {};

  if (!occasion || !type || !budget || !sensibilite) {
    res.status(400).json({ error: "Critères incomplets." });
    return;
  }

  const catalogText = catalog
    .map((p) => `${p.id}. ${p.name} - ${p.prix.toFixed(2)} EUR - ${p.monastere} - ${p.desc}`)
    .join("\n");

  const criteresText = [
    `Occasion: ${occasion}`,
    `Type de produit recherché: ${type}`,
    `Budget: ${budget}`,
    `Sensibilité: ${sensibilite}`,
    freeText ? `Précision du client: ${freeText}` : "Aucune précision supplémentaire",
  ].join("\n");

  const prompt = `Tu es un conseiller pour une boutique en ligne de produits d'artisanat monastique (issus de monastères et abbayes français).
Voici un extrait du catalogue (numéroté par id) :

${catalogText}

Voici les critères exprimés par un client :
${criteresText}

Choisis les 3 produits les plus pertinents de ce catalogue pour ce client.
Réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après, sans balises markdown, au format suivant :
{"recommandations": [{"id": <id du produit, entier>, "raison": "<2-3 phrases personnalisées expliquant pourquoi ce produit convient à ce client, en évoquant le savoir-faire ou l'histoire du monastère>"}]}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: "Erreur API Anthropic", details: errText });
      return;
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    let raw = textBlock ? textBlock.text : "{}";
    raw = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      res.status(502).json({ error: "Réponse IA non valide", raw });
      return;
    }

    const recommandations = (parsed.recommandations || [])
      .map((r) => {
        const product = catalog.find((p) => p.id === r.id);
        if (!product) return null;
        return { ...product, raison: r.raison || "" };
      })
      .filter(Boolean);

    res.status(200).json({ recommandations });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur", details: String(err) });
  }
};
