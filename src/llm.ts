// src/llm.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

function normalizeCandidates(input?: string): string[] {
  // remove "models/" se vier da listagem
  const wanted = (input || process.env.MODEL_NAME || "gemini-2.5-flash").trim().replace(/^models\//, "");
  const list = [
    wanted,                     // tenta o que veio primeiro (CLI/env)
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
  ].filter(Boolean);
  return Array.from(new Set(list));
}

export async function generateWithGemini(prompt: string, modelOverride?: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  const tried: string[] = [];
  let lastErr: any;

  for (const modelName of normalizeCandidates(modelOverride)) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const resp = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }]}],
        generationConfig: { temperature: 0.2 },
      });
      const text = resp.response?.text();
      if (text && text.trim()) return text;
      lastErr = new Error(`Empty response from ${modelName}`);
    } catch (e) {
      lastErr = e;
      tried.push(modelName);
    }
  }
  throw new Error(`Falha em todos os modelos. Tentados: ${tried.join(", ")}\nÚltimo erro: ${String(lastErr)}`);
}
