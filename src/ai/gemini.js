import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../env.js';
import { withRetry } from '../utils/retry.js';

// Convert history {role:'assistant'|'user', content} -> Gemini history {role:'model'|'user', parts:[{text}]}
export function toGeminiHistory(history) {
  return history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
}

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

async function askOnce({ modelName, userText, history, systemPrompt }) {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt
  });
  const chat = model.startChat({ history });
  const res = await chat.sendMessage(userText);
  const text = res.response.text()?.trim();
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

export async function askGeminiWithFallback({ userText, history, systemPrompt }) {
  const models = [env.GEMINI_PRIMARY_MODEL, env.GEMINI_FALLBACK_MODEL].filter(Boolean);

  let lastErr;
  for (const m of models) {
    try {
      const text = await withRetry(() => askOnce({
        modelName: m,
        userText,
        history,
        systemPrompt
      }));
      return text;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Gemini failed');
}
