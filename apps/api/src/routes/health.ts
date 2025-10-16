import { Router } from "express";
import { HealthResponse } from "@shared/index";

const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  const payload: HealthResponse = {
    ok: true,
    timestamp: new Date().toISOString()
  };

  res.json(payload);
});

export default healthRouter;
