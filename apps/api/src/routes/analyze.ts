import { Router } from "express";
import { fetchPoolSummary } from "../services/pools";
import { analyzeToken } from "../services/analyzer";

const analyzeRouter = Router();

analyzeRouter.get("/:tokenAddress", async (req, res) => {
  const { tokenAddress } = req.params;

  if (!tokenAddress) {
    return res.status(400).json({
      error: "Token address is required"
    });
  }

  try {
    const summary = await fetchPoolSummary(tokenAddress);
    const { pools } = summary;

    if (!pools.length) {
      return res.status(404).json({
        error: "No pools found for token"
      });
    }

    const response = await analyzeToken(pools[0].token, pools);
    return res.json(response);
  } catch (error) {
    console.error("Failed to generate analysis", error);
    return res.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to analyze token liquidity."
    });
  }
});

export default analyzeRouter;
