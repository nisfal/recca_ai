export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function withRetry(fn, { attempts = 4, baseDelay = 500, retryOn = /429|500|502|503|504|timeout|overloaded/i } = {}) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || err);
      if (!retryOn.test(msg)) throw err;
      const delay = baseDelay * Math.pow(2, i - 1);
      await sleep(delay);
    }
  }
  throw lastErr;
}
