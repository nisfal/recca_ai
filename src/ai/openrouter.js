import { env } from '../env.js';

export async function askOpenRouter({ userText, history, systemPrompt }) {
  if (!env.OPENROUTER_API_KEY) throw new Error('OpenRouter not configured');

  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://example.com',
      'X-Title': 'Telegram Bot'
    },
    body: JSON.stringify({
      model: env.OPENROUTER_FALLBACK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map(h => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.content
        })),
        { role: 'user', content: userText }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  const j = await r.json();
  const text = j?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenRouter empty or failed');
  return text;
}
