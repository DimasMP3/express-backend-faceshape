import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { imagesRouter } from "@/routes/images-router";
import { predictRouter } from "@/routes/predict-router";
import { predictBatchRouter } from "@/routes/predict-batch-router";
import { ENV } from "@/util/env";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({
    origin: ENV.FRONTEND_ORIGIN?.trim() || true,
    credentials: true,
  }));
  app.use(morgan("dev"));
  app.use(express.json({ limit: "15mb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Lightweight rate limit for prediction endpoints
  const predictLimiter = rateLimit({
    windowMs: ENV.PREDICT_RATE_LIMIT_WINDOW_MS,
    max: ENV.PREDICT_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api/images", imagesRouter);
  app.use("/predict", predictLimiter, predictRouter);
  app.use("/predict/batch", predictLimiter, predictBatchRouter);

  return app;
}
