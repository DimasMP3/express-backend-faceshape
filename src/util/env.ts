const req = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};
export const ENV = {
  PORT: Number(process.env.PORT ?? 5000),
  R2_URL: req("R2_URL"),
  DATABASE_URL: req("DATABASE_URL"),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
  HF_TOKEN: process.env.HF_TOKEN,
  GRADIO_SPACE_ID: process.env.GRADIO_SPACE_ID,
  GRADIO_URL: process.env.GRADIO_URL,
  MODEL_TIMEOUT_MS: Number(process.env.MODEL_TIMEOUT_MS ?? 25000),
  MODEL_RETRY_DELAYS_MS: (() => {
    const raw = process.env.MODEL_RETRY_DELAYS_MS;
    if (raw) {
      const arr = raw
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n >= 0);
      if (arr.length) return arr;
    }
    return [0, 500, 1500, 3000];
  })(),
  PREDICT_RATE_LIMIT_WINDOW_MS: Number(process.env.PREDICT_RATE_LIMIT_WINDOW_MS ?? 60_000),
  PREDICT_RATE_LIMIT_MAX: Number(process.env.PREDICT_RATE_LIMIT_MAX ?? 30),
};
