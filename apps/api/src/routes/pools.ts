import { Router } from "express";
import { fetchPoolSummary } from "../services/pools";

const poolsRouter = Router();

poolsRouter.get("/", async (_req, res) => {
  try {
    const summary = await fetchPoolSummary();
    return res.json(summary);
  } catch (error) {
    console.error("Failed to fetch pools", error);
    return res.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to fetch pool data from subgraph."
    });
  }
});

poolsRouter.get("/:tokenAddress", async (req, res) => {
  const { tokenAddress } = req.params;

  if (!tokenAddress) {
    return res.status(400).json({
      error: "Token address is required"
    });
  }

  try {
    const summary = await fetchPoolSummary(tokenAddress);
    return res.json(summary);
  } catch (error) {
    console.error("Failed to fetch pools", error);
    return res.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to fetch pool data from subgraph."
    });
  }
});

export default poolsRouter;
