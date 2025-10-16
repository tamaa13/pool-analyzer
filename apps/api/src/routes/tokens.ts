import { Router } from "express";
import { searchTokens } from "../services/tokens";

const tokensRouter = Router();

tokensRouter.get("/search", async (req, res) => {
  const queryParam = req.query.q;

  if (typeof queryParam !== "string" || !queryParam.trim()) {
    return res.status(400).json({
      error: "Query parameter 'q' is required."
    });
  }

  try {
    const tokens = await searchTokens(queryParam, 15);
    return res.json({
      tokens
    });
  } catch (error) {
    console.error("Failed to search tokens", error);
    return res.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to fetch token search results."
    });
  }
});

export default tokensRouter;
