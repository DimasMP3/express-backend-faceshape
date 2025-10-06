const req = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};
export const ENV = {
  PORT: Number(process.env.PORT ?? 5000),
  R2_URL: req("R2_URL"),                 
  DATABASE_URL: req("DATABASE_URL"),
};
