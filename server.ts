import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini if key exists
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API endpoint for parsing transaction descriptions
  app.post("/api/parse", async (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    if (!ai) {
      return res.status(503).json({ error: "Gemini API key is not configured on the server." });
    }

    try {
      const prompt = `Parse this Indonesian expense input and return ONLY a valid JSON object, no markdown, no explanation:
Input: "${text}"
Return format: {"item": "nama item", "amount": 25000, "category": "Makan"}
Categories must be one of: Makan, Transport, Minuman, Jajan, Belanja, Hiburan, Lainnya
Amount must be in full rupiah integer (18rb=18000, 25ribu=25000, 15k=15000, 1.5jt=1500000)`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              item: { type: Type.STRING },
              amount: { type: Type.INTEGER },
              category: { 
                type: Type.STRING,
                description: "Must be one of: Makan, Transport, Minuman, Jajan, Belanja, Hiburan, Lainnya" 
              }
            },
            required: ["item", "amount", "category"]
          }
        }
      });

      const rawText = response.text || "";
      const clean = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return res.json(parsed);
    } catch (err: any) {
      console.error("Gemini parse error:", err);
      return res.status(500).json({ error: err.message || "Failed to parse transaction with AI." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
