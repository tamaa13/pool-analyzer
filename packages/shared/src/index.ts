export interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface DepthRangeEstimate {
  percent: number;
  baseTokenAmount: number;
  quoteTokenAmount: number;
  usdValue: number;
}

export interface PoolSnapshot {
  poolId?: string;
  token: TokenMetadata;
  token0: TokenMetadata;
  token1: TokenMetadata;
  totalLiquidityUsd: number;
  feeTier: number;
  tvlToken0: number;
  tvlToken1: number;
  priceToken0InToken1: number;
  priceToken0Usd?: number;
  priceToken1Usd?: number;
  priceUsd?: number;
  depthEstimates: DepthRangeEstimate[];
  volume24hUsd?: number;
  volume24hToken0?: number;
  volume24hToken1?: number;
  apr24hPct?: number;
  updatedAt: string;
}

export interface PoolSummary {
  tokenAddress: string;
  pools: PoolSnapshot[];
  requestedId?: string;
  relatedTokenAddresses?: string[];
}

export type LiquidityHealthLabel = "strong" | "moderate" | "weak";

export interface LiquidityHealthFactor {
  type: "positive" | "negative";
  label: string;
  detail: string;
}

export interface LiquidityHealth {
  score: number;
  label: LiquidityHealthLabel;
  summary: string;
  factors: LiquidityHealthFactor[];
}

export interface AiInsight {
  id: string;
  title: string;
  sentiment: "bullish" | "neutral" | "bearish";
  rationale: string;
}

export interface AnalyzeResponse {
  token: TokenMetadata;
  summary: string;
  opportunities: string[];
  risks: string[];
  aiInsights?: AiInsight[];
  liquidityHealth: LiquidityHealth;
  generatedAt: string;
}

export interface HealthResponse {
  ok: boolean;
  timestamp: string;
}

export const SUPPORTED_FEE_TIERS = [100, 500, 2500, 10000] as const;

export interface TokenSearchResult extends TokenMetadata {
  liquidityUsd?: number;
}
