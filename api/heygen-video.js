// Génère une vidéo HeyGen de l'avatar "Conseiller" prononçant un texte donné.
// Deux endpoints :
//   POST /api/heygen-video          -> lance la génération, renvoie un video_id
//   GET  /api/heygen-video?id=...   -> vérifie le statut et renvoie l'URL vidéo si prête

const AVATAR_ID = "4db4b7e7274b443b881d435959108007";
const VOICE_ID_ENV = "HEYGEN_VOICE_ID"; // optionnel : ID de la voix Marcel si nécessaire

module.exports = async (req, res) => {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Clé API HeyGen non configurée sur le serveur." });
    return;
  }

  if (req.method === "POST") {
    const { text } = req.body || {};
    if (!text) {
      res.status(400).json({ error: "Texte manquant." });
      return;
    }

    const voiceId = process.env[VOICE_ID_ENV];

    const videoInput = {
      character: {
        type: "avatar",
        avatar_id: AVATAR_ID,
        avatar_style: "normal",
      },
      voice: {
        type: "text",
        input_text: text,
        speed: 1.0,
      },
    };

    if (voiceId) {
      videoInput.voice.voice_id = voiceId;
    }

    try {
      const response = await fetch("https://api.heygen.com/v2/video/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({
          video_inputs: [videoInput],
          dimension: { width: 720, height: 1280 },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        res.status(502).json({ error: "Erreur API HeyGen", details: data });
        return;
      }

      const videoId = data.data && data.data.video_id;
      if (!videoId) {
        res.status(502).json({ error: "Réponse HeyGen inattendue", details: data });
        return;
      }

      res.status(200).json({ video_id: videoId });
    } catch (err) {
      res.status(500).json({ error: "Erreur serveur", details: String(err) });
    }
    return;
  }

  if (req.method === "GET") {
    const videoId = req.query.id;
    if (!videoId) {
      res.status(400).json({ error: "Paramètre id manquant." });
      return;
    }

    try {
      const response = await fetch(
        "https://api.heygen.com/v1/video_status.get?video_id=" + encodeURIComponent(videoId),
        {
          method: "GET",
          headers: { "X-Api-Key": apiKey },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        res.status(502).json({ error: "Erreur API HeyGen", details: data });
        return;
      }

      const status = data.data && data.data.status;
      const videoUrl = data.data && data.data.video_url;

      res.status(200).json({ status: status, video_url: videoUrl || null });
    } catch (err) {
      res.status(500).json({ error: "Erreur serveur", details: String(err) });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
};
