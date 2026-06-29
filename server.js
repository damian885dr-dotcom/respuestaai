import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;
const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const geminiTimeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || 55000);

app.use(cors());
app.use(express.json({ limit: "256kb" }));

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "respuesta-pro-ai",
    message: "Backend funcionando. Usa /health para estado y /api/generate-reply para generar respuestas.",
    endpoints: {
      health: "/health",
      testGemini: "/test-gemini",
      generateReply: "/api/generate-reply"
    }
  });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "respuesta-pro-ai",
    model: modelName,
    geminiApiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString()
  });
});

app.get("/test-gemini", async (_req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "GEMINI_API_KEY no configurada en Render"
      });
    }

    const reply = await callGemini({
      apiKey,
      modelName,
      prompt: "Responde solamente con esta frase: Gemini funcionando"
    });

    res.json({
      ok: true,
      model: modelName,
      reply
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Gemini no respondio correctamente",
      detail: String(error?.message || error)
    });
  }
});

app.post("/api/generate-reply", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY no configurada" });
    }

    const {
      customerMessage = "",
      category = "General",
      tone = "Profesional",
      businessName = "",
      signature = "",
      extraContext = "",
      action = "generate"
    } = req.body || {};

    if (!String(customerMessage).trim()) {
      return res.status(400).json({ error: "customerMessage es requerido" });
    }

    const prompt = buildPrompt({
      customerMessage,
      category,
      tone,
      businessName,
      signature,
      extraContext,
      action
    });

    const reply = await callGemini({ apiKey, modelName, prompt });
    if (!reply) {
      return res.status(502).json({ error: "Gemini no devolvio respuesta" });
    }
    res.json({ reply });
  } catch (error) {
    console.error("generate-reply error", error);
    res.status(500).json({
      error: "No se pudo generar la respuesta",
      detail: process.env.NODE_ENV === "production" ? undefined : String(error?.message || error)
    });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.listen(port, () => {
  console.log(`Respuesta Pro AI backend escuchando en puerto ${port}`);
});

function buildPrompt(input) {
  const actionInstruction = {
    generate: "Genera una respuesta nueva para el cliente.",
    shorter: "Reescribi el texto para que sea mas corto, directo y claro.",
    kinder: "Reescribi el texto con un tono mas amable y cercano.",
    formal: "Reescribi el texto con un tono mas formal y profesional.",
    improve: "Mejora la redaccion del texto manteniendo el mismo sentido."
  }[input.action] || "Genera una respuesta nueva para el cliente.";

  return `
Actua como asistente profesional de atencion al cliente. Redacta una respuesta breve, clara y amable para WhatsApp.
No inventes datos. Si falta informacion, pedila de forma educada.
Adapta la respuesta a la categoria, tono y contexto indicados.
Usa espanol argentino neutro. No uses comillas al principio ni al final. No uses emojis excesivos.
La respuesta debe estar lista para copiar y enviar por WhatsApp.

Accion: ${actionInstruction}
Categoria: ${input.category}
Tono: ${input.tone}
Negocio: ${input.businessName || "No informado"}
Firma: ${input.signature || "Sin firma"}
Contexto extra: ${input.extraContext || "Sin contexto extra"}

Mensaje o texto base:
${input.customerMessage}
`.trim();
}

async function callGemini({ apiKey, modelName, prompt }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), geminiTimeoutMs);
  const cleanModel = String(modelName).replace(/^models\//, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.55,
          topP: 0.9,
          maxOutputTokens: 500
        }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || `Gemini HTTP ${response.status}`;
      throw new Error(message);
    }

    return extractText(data).trim();
  } finally {
    clearTimeout(timeout);
  }
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || "").join("").trim();
}
