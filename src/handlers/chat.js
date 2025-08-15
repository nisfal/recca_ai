import { env } from '../env.js';
import { askGeminiWithFallback, toGeminiHistory } from '../ai/gemini.js';
import { askOpenRouter } from '../ai/openrouter.js';

export function registerChat(bot) {
  bot.on('text', async (ctx) => {
    if (!ctx.session) ctx.session = {};
    if (!ctx.session.history) ctx.session.history = [];

    const userText = ctx.message.text?.trim();
    if (!userText) return;

    try { await ctx.sendChatAction(env.TYPING_ACTION); } catch {}

    const recent = ctx.session.history.slice(-env.MAX_HISTORY);
    const geminiHistory = toGeminiHistory(recent);

    try {
      let answer = await askGeminiWithFallback({
        userText,
        history: geminiHistory,
        systemPrompt: env.SYSTEM_PROMPT
      });

      ctx.session.history.push({ role: 'user', content: userText });
      ctx.session.history.push({ role: 'assistant', content: answer });

      await ctx.reply(answer, { reply_to_message_id: ctx.message.message_id });
    } catch (err) {
      console.error('Gemini failed, trying OpenRouter (if configured):', err);

      try {
        let answer = await askOpenRouter({
          userText,
          history: recent, // OpenRouter pakai format OpenAI-like
          systemPrompt: env.SYSTEM_PROMPT
        });

        ctx.session.history.push({ role: 'user', content: userText });
        ctx.session.history.push({ role: 'assistant', content: answer });

        await ctx.reply(answer, { reply_to_message_id: ctx.message.message_id });
      } catch (e2) {
        console.error('All providers failed:', e2);
        await ctx.reply('⚠️ Layanan sedang padat. Coba lagi sebentar lagi ya.');
      }
    }
  });
}
