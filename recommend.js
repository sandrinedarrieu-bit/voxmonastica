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

  const { mode, occasion, type, budget, sensibilite, freeText, message, history } = req.body || {};

  const catalogText = catalog
    .map((p) => `${p.id}. ${p.name} - ${p.prix.toFixed(2)} EUR - ${p.monastere} - ${p.desc}`)
    .join("\n");

  let prompt;

  if (mode === "chat") {
    // Mode conversationnel : l'utilisateur écrit librement, l'IA extrait les
    // critères et peut soit poser une question de clarification, soit
    // proposer directement des recommandations.
    if (!message) {
      res.status(400).json({ error: "Message manquant." });
      return;
    }

    const historyText = (history || [])
      .map((h) => (h.role === "user" ? "Client: " : "Conseiller: ") + h.content)
      .join("\n");

    prompt = "Tu es un conseiller chaleureux pour une boutique en ligne de produits d'artisanat monastique (issus de monastères et abbayes français).\n" +
"Voici un extrait du catalogue (numéroté par id) :\n\n" +
catalogText + "\n\n" +
"Voici l'historique de la conversation avec le client :\n" +
(historyText ? historyText + "\n" : "") +
"Client: " + message + "\n\n" +
"Analyse ce que le client recherche (occasion, type de produit, budget, sensibilités).\n" +
"Deux cas possibles :\n" +
"1. Si tu as assez d'informations pour faire de bonnes recommandations, choisis 1 à 3 produits pertinents du catalogue.\n" +
"2. Si des informations essentielles manquent (par exemple aucune indication de budget, de type de produit, ou de destinataire), pose UNE seule question de clarification courte et naturelle, sans recommandation.\n\n" +
"Réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après, sans balises markdown, dans l'un de ces deux formats exacts :\n\n" +
"Si tu recommandes des produits :\n" +
'{"type": "recommandations", "message": "<une phrase d\'introduction chaleureuse et personnalisée>", "recommandations": [{"id": <id du produit, entier>, "raison": "<2-3 phrases personnalisées expliquant pourquoi ce produit convient, en évoquant le savoir-faire ou l\'histoire du monastère>"}]}\n\n' +
"Si tu poses une question :\n" +
'{"type": "question", "message": "<ta question de clarification, ton naturel et chaleureux>"}';
  } else {
    // Mode formulaire (questionnaire à choix)
    if (!occasion || !type || !budget || !sensibilite) {
      res.status(400).json({ error: "Critères incomplets." });
      return;
    }

    const criteresText = [
      "Occasion: " + occasion,
      "Type de produit recherché: " + type,
      "Budget: " + budget,
      "Sensibilité: " + sensibilite,
      freeText ? "Précision du client: " + freeText : "Aucune précision supplémentaire",
    ].join("\n");

    prompt = "Tu es un conseiller pour une boutique en ligne de produits d'artisanat monastique (issus de monastères et abbayes français).\n" +
"Voici un extrait du catalogue (numéroté par id) :\n\n" +
catalogText + "\n\n" +
"Voici les critères exprimés par un client :\n" +
criteresText + "\n\n" +
"Choisis les 3 produits les plus pertinents de ce catalogue pour ce client.\n" +
"Réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après, sans balises markdown, au format suivant :\n" +
'{"recommandations": [{"id": <id du produit, entier>, "raison": "<2-3 phrases personnalisées expliquant pourquoi ce produit convient à ce client, en évoquant le savoir-faire ou l\'histoire du monastère>"}]}';
  }

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

    if (mode === "chat") {
      if (parsed.type === "question") {
        res.status(200).json({ type: "question", message: parsed.message || "" });
        return;
      }

      const recommandations = (parsed.recommandations || [])
        .map((r) => {
          const product = catalog.find((p) => p.id === r.id);
          if (!product) return null;
          return Object.assign({}, product, { raison: r.raison || "" });
        })
        .filter(Boolean);

      res.status(200).json({
        type: "recommandations",
        message: parsed.message || "",
        recommandations: recommandations,
      });
      return;
    }

    const recommandations = (parsed.recommandations || [])
      .map((r) => {
        const product = catalog.find((p) => p.id === r.id);
        if (!product) return null;
        return Object.assign({}, product, { raison: r.raison || "" });
      })
      .filter(Boolean);

    res.status(200).json({ recommandations: recommandations });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur", details: String(err) });
  }
};
