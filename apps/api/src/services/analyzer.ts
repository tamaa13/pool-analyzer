import fetch from "node-fetch";
import {
  AiInsight,
  AnalyzeResponse,
  LiquidityHealth,
  LiquidityHealthFactor,
  PoolSnapshot,
  TokenMetadata
} from "@shared/index";
import env from "../env";

type HeuristicAnalysis = Pick<
  AnalyzeResponse,
  "summary" | "opportunities" | "risks" | "aiInsights" | "liquidityHealth"
>;

type AiModelInsight = {
  id?: string;
  title: string;
  sentiment: AiInsight["sentiment"];
  rationale: string;
};

type AiModelResponse = {
  summary?: string;
  opportunities?: string[];
  risks?: string[];
  aiInsights?: AiModelInsight[];
};

const STABLE_SYMBOLS = new Set([
  "USDT",
  "USDC",
  "BUSD",
  "DAI",
  "FDUSD",
  "TUSD"
]);

const stripTrailingZeros = (value: string) =>
  value.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");

const formatWithSuffix = (value: number, divisor: number, suffix: string) => {
  const base = value / divisor;
  const decimals = base >= 100 ? 0 : base >= 10 ? 1 : 2;
  return `${stripTrailingZeros(base.toFixed(decimals))}${suffix}`;
};

const formatUsd = (value: number): string => {
  if (Number.isNaN(value)) {
    return "n/a";
  }

  const sign = value < 0 ? "-" : "";
  const absValue = Math.abs(value);

  if (absValue === 0) {
    return "$0.00";
  }

  if (absValue < 0.01) {
    return `${sign}<${sign ? "$" : "$"}0.01`;
  }

  if (absValue >= 1_000_000_000) {
    return `${sign}$${formatWithSuffix(absValue, 1_000_000_000, "B")}`;
  }

  if (absValue >= 1_000_000) {
    return `${sign}$${formatWithSuffix(absValue, 1_000_000, "M")}`;
  }

  if (absValue >= 1_000) {
    return `${sign}$${formatWithSuffix(absValue, 1_000, "K")}`;
  }

  if (absValue < 1) {
    return `${sign}$${absValue.toFixed(2)}`;
  }

  const decimals = absValue >= 100 ? 0 : absValue >= 10 ? 1 : 2;

  return `${sign}$${stripTrailingZeros(absValue.toFixed(decimals))}`;
};

const getDepthUsd = (pool: PoolSnapshot, percent: number): number =>
  pool.depthEstimates.find((estimate) => estimate.percent === percent)?.usdValue ??
  0;

const isStableSymbol = (symbol?: string): boolean =>
  symbol ? STABLE_SYMBOLS.has(symbol.toUpperCase()) : false;

const isStablePool = (pool: PoolSnapshot): boolean =>
  isStableSymbol(pool.token0.symbol) || isStableSymbol(pool.token1.symbol);

const determineSentiment = (pool: PoolSnapshot): AiInsight["sentiment"] => {
  const apr = pool.apr24hPct ?? 0;
  const depthUsd = getDepthUsd(pool, 1);

  if (apr >= 20 || pool.totalLiquidityUsd >= 1_000_000 || depthUsd >= 75_000) {
    return "bullish";
  }

  if (apr <= 5 || pool.totalLiquidityUsd < 50_000 || depthUsd < 5_000) {
    return "bearish";
  }

  return "neutral";
};

const formatPair = (pool: PoolSnapshot): string =>
  `${pool.token0.symbol}/${pool.token1.symbol}`;

const summarisePool = (
  pool: PoolSnapshot,
  totalLiquidityUsd: number
): string => {
  const apr = pool.apr24hPct?.toFixed(1) ?? "n/a";
  const depthUsd = getDepthUsd(pool, 1);
  const share =
    totalLiquidityUsd > 0
      ? ((pool.totalLiquidityUsd / totalLiquidityUsd) * 100).toFixed(0)
      : "0";

  return `${formatPair(pool)} ${pool.feeTier / 10000}% — ${formatUsd(
    pool.totalLiquidityUsd
  )} TVL, ±1% depth ${formatUsd(depthUsd)}, APR ${apr}% (~${share}% share)`;
};

type LiquidityMetrics = {
  totalLiquidityUsd: number;
  topPool?: PoolSnapshot;
  topPoolShare: number;
  poolCount: number;
  maxDepth1PctUsd: number;
  avgDepth1PctUsd: number;
  stablePoolCount: number;
  pricedPoolCount: number;
};

const computeLiquidityMetrics = (pools: PoolSnapshot[]): LiquidityMetrics => {
  if (!pools.length) {
    return {
      totalLiquidityUsd: 0,
      topPool: undefined,
      topPoolShare: 0,
      poolCount: 0,
      maxDepth1PctUsd: 0,
      avgDepth1PctUsd: 0,
      stablePoolCount: 0,
      pricedPoolCount: 0
    };
  }

  const totalLiquidityUsd = pools.reduce(
    (accumulator, pool) => accumulator + pool.totalLiquidityUsd,
    0
  );

  const sortedByLiquidity = pools
    .slice()
    .sort((a, b) => b.totalLiquidityUsd - a.totalLiquidityUsd);
  const topPool = sortedByLiquidity[0];
  const topPoolShare =
    totalLiquidityUsd > 0 && topPool
      ? topPool.totalLiquidityUsd / totalLiquidityUsd
      : 0;

  const depthValues = pools.map((pool) => getDepthUsd(pool, 1));
  const maxDepth1PctUsd = depthValues.length
    ? Math.max(...depthValues)
    : 0;
  const avgDepth1PctUsd = depthValues.length
    ? depthValues.reduce((acc, value) => acc + value, 0) / depthValues.length
    : 0;

  const stablePoolCount = pools.filter(isStablePool).length;
  const pricedPoolCount = pools.filter(
    (pool) =>
      typeof pool.priceUsd === "number" && !Number.isNaN(pool.priceUsd)
  ).length;

  return {
    totalLiquidityUsd,
    topPool,
    topPoolShare,
    poolCount: pools.length,
    maxDepth1PctUsd,
    avgDepth1PctUsd,
    stablePoolCount,
    pricedPoolCount
  };
};

const deriveLiquidityHealth = (
  metrics: LiquidityMetrics
): {
  health: LiquidityHealth;
  positives: LiquidityHealthFactor[];
  negatives: LiquidityHealthFactor[];
} => {
  if (metrics.poolCount === 0) {
    const factor: LiquidityHealthFactor = {
      type: "negative",
      label: "No tracked liquidity",
      detail: "Token has no indexed PancakeSwap v3 pools."
    };

    return {
      health: {
        score: 0,
        label: "weak",
        summary: "No indexed PancakeSwap v3 liquidity detected.",
        factors: [factor]
      },
      positives: [],
      negatives: [factor]
    };
  }

  let score = 50;
  const positives: LiquidityHealthFactor[] = [];
  const negatives: LiquidityHealthFactor[] = [];

  if (metrics.totalLiquidityUsd >= 2_000_000) {
    score += 25;
    positives.push({
      type: "positive",
      label: "Deep liquidity",
      detail: `Consolidated liquidity totals ${formatUsd(metrics.totalLiquidityUsd)}.`
    });
  } else if (metrics.totalLiquidityUsd >= 500_000) {
    score += 15;
    positives.push({
      type: "positive",
      label: "Adequate liquidity",
      detail: `About ${formatUsd(metrics.totalLiquidityUsd)} TVL across pools.`
    });
  } else if (metrics.totalLiquidityUsd >= 150_000) {
    score += 5;
  } else if (metrics.totalLiquidityUsd >= 50_000) {
    score -= 5;
    negatives.push({
      type: "negative",
      label: "Thin liquidity",
      detail: "Total liquidity < $150K can trigger meaningful slippage."
    });
  } else {
    score -= 15;
    negatives.push({
      type: "negative",
      label: "Severely thin liquidity",
      detail: "Total liquidity < $50K, so larger trades risk failing."
    });
  }

  if (metrics.maxDepth1PctUsd >= 150_000) {
    score += 20;
    positives.push({
      type: "positive",
      label: "Strong ±1% depth",
      detail: `Best ±1% depth equals ${formatUsd(metrics.maxDepth1PctUsd)}.`
    });
  } else if (metrics.maxDepth1PctUsd >= 40_000) {
    score += 10;
  } else if (metrics.maxDepth1PctUsd >= 10_000) {
    score += 3;
  } else {
    score -= 10;
    negatives.push({
      type: "negative",
      label: "Shallow depth",
      detail: "±1% depth < $10K; even small orders may slip significantly."
    });
  }

  if (metrics.poolCount > 1) {
    if (metrics.topPoolShare <= 0.55) {
      score += 10;
      positives.push({
        type: "positive",
        label: "Distributed liquidity",
        detail: "Fee-tier distribution stays balanced (<55% in the top pool)."
      });
    } else if (metrics.topPoolShare > 0.8) {
      score -= 8;
      negatives.push({
        type: "negative",
        label: "High concentration",
        detail: "More than 80% of liquidity sits in a single pool."
      });
    }
  } else {
    score -= 6;
    negatives.push({
      type: "negative",
      label: "Single pool only",
      detail: "Liquidity exists in one pool with no alternate fee tiers."
    });
  }

  if (metrics.stablePoolCount > 0) {
    score += 5;
    positives.push({
      type: "positive",
      label: "Stablecoin pair available",
      detail: "A stablecoin pair helps keep price discovery anchored."
    });
  } else {
    negatives.push({
      type: "negative",
      label: "No stablecoin pair",
      detail: "Without a stablecoin pair, price exposure stays more volatile."
    });
  }

  if (metrics.pricedPoolCount === metrics.poolCount) {
    positives.push({
      type: "positive",
      label: "USD pricing available",
      detail: "Every pool has a valid USD price estimate."
    });
  } else if (metrics.pricedPoolCount === 0) {
    score -= 12;
    negatives.push({
      type: "negative",
      label: "USD price unavailable",
      detail: "Unable to estimate USD pricing; TVL comparisons may be skewed."
    });
  } else {
    score -= 4;
    negatives.push({
      type: "negative",
      label: "Partial USD pricing",
      detail: "Some pools lack USD price estimates."
    });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const label: LiquidityHealth["label"] =
    score >= 75 ? "strong" : score >= 50 ? "moderate" : "weak";

  const summary = `Liquidity health score ${score} (${label}). Total ${formatUsd(
    metrics.totalLiquidityUsd
  )} across ${metrics.poolCount} pools; top pool holds ~${Math.round(
    metrics.topPoolShare * 100
  )}% of tracked liquidity.`;

  const health: LiquidityHealth = {
    score,
    label,
    summary,
    factors: [...positives, ...negatives]
  };

  return { health, positives, negatives };
};

const buildHeuristicAnalysis = (
  token: TokenMetadata,
  pools: PoolSnapshot[]
): HeuristicAnalysis => {
  const significantPools = pools
    .slice()
    .sort((a, b) => b.totalLiquidityUsd - a.totalLiquidityUsd);

  const primaryPool = significantPools[0];

  const metrics = computeLiquidityMetrics(significantPools);
  const { health, positives, negatives } = deriveLiquidityHealth(metrics);

  const totalLiquidityUsd = metrics.totalLiquidityUsd;

  const poolOpportunities = significantPools.slice(0, 3).map((pool) => {
    const depthUsd = getDepthUsd(pool, 1);
    const share =
      totalLiquidityUsd > 0
        ? Math.round((pool.totalLiquidityUsd / totalLiquidityUsd) * 100)
        : 0;
    const apr =
      pool.apr24hPct !== undefined
        ? `${pool.apr24hPct.toFixed(1)}% APR`
        : "APR n/a";

    return `Consider ${formatPair(pool)} ${pool.feeTier / 10000}% — ${formatUsd(
      pool.totalLiquidityUsd
    )} TVL, ±1% depth ${formatUsd(depthUsd)}, ${apr}, contributes ${share}% of liquidity.`;
  });

  const factorOpportunities = positives
    .map((factor) => factor.detail)
    .filter(Boolean);

  const opportunities = Array.from(
    new Set([...poolOpportunities, ...factorOpportunities])
  ).slice(0, 3);

  const riskMessages = negatives
    .map((factor) => factor.detail)
    .filter(Boolean);

  if (!riskMessages.length) {
    riskMessages.push(
      "Monitor liquidity migration across pools and refresh data before executing size."
    );
  }

  const aiInsights: AiInsight[] = significantPools.map((pool) => ({
    id: `${pool.poolId ?? pool.token.address}-${pool.feeTier}`,
    title: `${formatPair(pool)} ${pool.feeTier / 10000}% insight`,
    sentiment: determineSentiment(pool),
    rationale: summarisePool(pool, totalLiquidityUsd)
  }));

  return {
    summary: primaryPool
      ? `${health.summary} Primary depth sits in ${formatPair(primaryPool)} ${
          primaryPool.feeTier / 10000
        }% with ${formatUsd(primaryPool.totalLiquidityUsd)} TVL.`
      : health.summary,
    opportunities,
    risks: Array.from(new Set(riskMessages)).slice(0, 3),
    aiInsights,
    liquidityHealth: health
  };
};

const buildPrompt = (token: TokenMetadata, pools: PoolSnapshot[]): string => {
  const poolLines = pools
    .map((pool) => {
      const apr = pool.apr24hPct ? `${pool.apr24hPct.toFixed(2)}%` : "n/a";
      return [
        `Pair: ${formatPair(pool)}`,
        `Fee Tier: ${pool.feeTier / 10000}%`,
        `Total Liquidity (USD): ${pool.totalLiquidityUsd.toFixed(2)}`,
        `TVL Token0: ${pool.tvlToken0.toFixed(4)}`,
        `TVL Token1: ${pool.tvlToken1.toFixed(4)}`,
        `Price Token0 in Token1: ${pool.priceToken0InToken1.toFixed(6)}`,
        `Price USD (est): ${pool.priceUsd ?? "n/a"}`,
        `Depth ±1% USD: ${pool.depthEstimates[0]?.usdValue.toFixed(2) ?? "n/a"}`,
        `Volume 24h USD: ${pool.volume24hUsd?.toFixed(2) ?? "n/a"}`,
        `APR 24h %: ${apr}`
      ].join(" | ");
    })
    .join("\n");

  return `
You are an expert DeFi analyst focused on PancakeSwap v3 liquidity.
Analyse the following pools for token ${token.symbol} (${token.address}).
Return ONLY valid JSON with the structure:
{
  "summary": string,
  "opportunities": string[],
  "risks": string[],
  "aiInsights": Array<{ "title": string, "sentiment": "bullish" | "neutral" | "bearish", "rationale": string }>
}

Use concise bullet points (<= 3 per section). Sentiment should reflect the pool risk/return profile.

Pools:
${poolLines}`.trim();
};

const extractJson = (raw: string): AiModelResponse | null => {
  const trimmed = raw.trim();
  const jsonCandidate = trimmed.startsWith("{")
    ? trimmed
    : trimmed.replace(/```json|```/g, "");

  try {
    return JSON.parse(jsonCandidate) as AiModelResponse;
  } catch (error) {
    const start = jsonCandidate.indexOf("{");
    const end = jsonCandidate.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(jsonCandidate.slice(start, end + 1)) as AiModelResponse;
      } catch {
        return null;
      }
    }
  }

  return null;
};

const callOpenRouter = async (
  token: TokenMetadata,
  pools: PoolSnapshot[]
): Promise<AiModelResponse | null> => {
  if (!env.aiApiKey) {
    return null;
  }

  const response = await fetch(`${env.openrouterBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.aiApiKey}`,
      "HTTP-Referer": "https://github.com/arifnovrianpratama/pool-analyzer",
      "X-Title": "PancakeSwap Pool Analyzer"
    },
    body: JSON.stringify({
      model: env.aiModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a DeFi analyst. Respond concisely with actionable, risk-aware insights in JSON."
        },
        {
          role: "user",
          content: buildPrompt(token, pools)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(
      `OpenRouter request failed (${response.status} ${response.statusText})`
    );
  }

  const result = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  return extractJson(content);
};

export const analyzeToken = async (
  token: TokenMetadata,
  pools: PoolSnapshot[]
): Promise<AnalyzeResponse> => {
  const heuristic = buildHeuristicAnalysis(token, pools);

  if (env.aiProvider !== "openrouter" || pools.length === 0) {
    return {
      token,
      ...heuristic,
      liquidityHealth: heuristic.liquidityHealth,
      generatedAt: new Date().toISOString()
    };
  }

  try {
    const aiResult = await callOpenRouter(token, pools);

    if (!aiResult) {
      return {
        token,
        ...heuristic,
        liquidityHealth: heuristic.liquidityHealth,
        generatedAt: new Date().toISOString()
      };
    }

    return {
      token,
      summary: aiResult.summary ?? heuristic.summary,
      opportunities: aiResult.opportunities?.length
        ? aiResult.opportunities
        : heuristic.opportunities,
      risks: aiResult.risks?.length ? aiResult.risks : heuristic.risks,
      aiInsights: aiResult.aiInsights?.length
        ? aiResult.aiInsights.map((insight, index) => {
            const fallback = heuristic.aiInsights?.[index];
            return {
              id:
                insight.id ??
                fallback?.id ??
                `${token.address}-${fallback?.title ?? index}`,
              title: insight.title,
              sentiment: insight.sentiment,
              rationale: insight.rationale
            };
          })
        : heuristic.aiInsights ?? [],
      liquidityHealth: heuristic.liquidityHealth,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("AI provider failed, falling back to heuristics", error);

    return {
      token,
      ...heuristic,
      liquidityHealth: heuristic.liquidityHealth,
      generatedAt: new Date().toISOString()
    };
  }
};
