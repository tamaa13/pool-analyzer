import cors from "cors";
import express from "express";
import env from "./env";
import healthRouter from "./routes/health";
import poolsRouter from "./routes/pools";
import analyzeRouter from "./routes/analyze";
import tokensRouter from "./routes/tokens";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/pools", poolsRouter);
app.use("/api/analyze", analyzeRouter);
app.use("/api/tokens", tokensRouter);

app.use((req, res) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`
  });
});

const start = () => {
  app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });
};

start();
