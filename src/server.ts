import dotenv from "dotenv";
dotenv.config();
import { createApp } from "./app";
import { ENV } from "@/util/env";

const app = createApp();

app.listen(ENV.PORT, () => {
  console.log(`Service listening on http://localhost:${ENV.PORT}`);
});
