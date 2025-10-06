import express from "express";
import cors from "cors";
import morgan from "morgan";
import { imagesRouter } from "@/routes/images-router";
import { predictRouter } from "@/routes/predict-router";

export function createApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(morgan("dev"));
  app.use(express.json({ limit: "15mb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/images", imagesRouter);
  app.use("/predict", predictRouter);

  return app;
}
