import { config } from "dotenv";

config();

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  port: parseNumber(process.env.PORT, 4000),
  chainId: parseNumber(process.env.CHAIN_ID, 56),
  rpcUrlBsc: process.env.RPC_URL_BSC ?? "",
  pancakeFactory: process.env.PANCAKE_V3_FACTORY ?? "",
  pancakeFeeTiers: (process.env.PANCAKE_V3_FEE_TIERS ?? "")
    .split(",")
    .map((tier) => Number(tier.trim()))
    .filter((tier) => Number.isFinite(tier)),
  subgraphUrl: process.env.SUBGRAPH_URL ?? "",
  subgraphAuthHeader: process.env.SUBGRAPH_AUTH_HEADER ?? "",
  subgraphAuthToken: process.env.SUBGRAPH_AUTH_TOKEN ?? "",
  ponderGraphqlUrl:
    process.env.PONDER_GRAPHQL_URL ?? "http://localhost:42069/graphql",
  priceWbnbUsd: parseNumber(process.env.PRICE_WBNB_USD, 0),
  aiProvider: (process.env.AI_PROVIDER ?? "dummy").toLowerCase() as
    | "dummy"
    | "openrouter",
  aiApiKey: process.env.AI_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "openai/gpt-4o-mini",
  openrouterBaseUrl:
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  nextPublicApiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  maxRpcConcurrency: Math.max(1, parseNumber(process.env.MAX_RPC_CONCURRENCY, 3))
};

export default env;
