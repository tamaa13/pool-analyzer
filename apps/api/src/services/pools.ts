import {
  PoolSnapshot,
  PoolSummary,
  SUPPORTED_FEE_TIERS,
  TokenMetadata
} from "@shared/index";
import env from "../env";
import { ponderRequest } from "../utils/ponderClient";

const STABLE_SYMBOLS = new Set(["USDT", "USDC", "BUSD", "DAI", "FDUSD", "TUSD"]);
const WBNB_SYMBOLS = new Set(["WBNB", "BNB"]);
const DEFAULT_POOL_LIMIT = 25;
const MIN_TVL_USD_FOR_APR = 50;
const MIN_VOLUME_USD_FOR_APR = 10;
const MAX_ANNUALIZED_APR_PCT = 1_000_000;

const POOLS_BY_TOKEN_QUERY = `
  query PoolsByToken($token: ID!, $feeTiers: [BigInt!], $limit: Int!) {
    pools(
      where: {
        or: [
          { feeTier_in: $feeTiers, token0_: { id: $token } },
          { feeTier_in: $feeTiers, token1_: { id: $token } }
        ]
      }
      first: $limit
      orderBy: createdAtTimestamp
      orderDirection: desc
    ) {
      id
      feeTier
      createdAtTimestamp
      token0Price
      token1Price
      totalValueLockedUSD
      totalValueLockedToken0
      totalValueLockedToken1
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
    }
  }
`;

const RECENT_POOLS_QUERY = `
  query RecentPools($feeTiers: [BigInt!], $limit: Int!) {
    pools(
      where: { feeTier_in: $feeTiers }
      first: $limit
      orderBy: createdAtTimestamp
      orderDirection: desc
    ) {
      id
      feeTier
      createdAtTimestamp
      token0Price
      token1Price
      totalValueLockedUSD
      totalValueLockedToken0
      totalValueLockedToken1
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
    }
  }
`;

const POOL_DAY_DATA_QUERY = `
  query PoolDayData($poolIds: [ID!]!, $limit: Int!) {
    poolDayDatas(
      where: { pool_in: $poolIds }
      first: $limit
      orderBy: date
      orderDirection: desc
    ) {
      pool { id }
      volumeUSD
    }
  }
`;

const POOL_BY_ID_QUERY = `
  query PoolById($id: ID!) {
    pool(id: $id) {
      id
      feeTier
      createdAtTimestamp
      token0Price
      token1Price
      totalValueLockedUSD
      totalValueLockedToken0
      totalValueLockedToken1
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
    }
  }
`;

type TokenFragment = {
  id: string;
  symbol: string | null;
  name: string | null;
  decimals: string | number | null;
};

type GraphPool = {
  id: string;
  feeTier?: string | number | null;
  createdAtTimestamp?: string | number | null;
  token0Price?: string | null;
  token1Price?: string | null;
  totalValueLockedUSD?: string | null;
  totalValueLockedToken0?: string | null;
  totalValueLockedToken1?: string | null;
  token0: TokenFragment;
  token1: TokenFragment;
};

type PoolsByTokenResponse = {
  pools: GraphPool[];
};

type RecentPoolsResponse = {
  pools: GraphPool[];
};

type PoolDayDataEntry = {
  pool: { id: string } | null;
  volumeUSD?: string | null;
};

type PoolDayDataResponse = {
  poolDayDatas: PoolDayDataEntry[];
};

type PoolByIdResponse = {
  pool: GraphPool | null;
};

const normalizeAddress = (value?: string | null) => (value ?? "").toLowerCase();

const isStable = (symbol?: string | null) =>
  symbol ? STABLE_SYMBOLS.has(symbol.toUpperCase()) : false;

const isWbnb = (symbol?: string | null) =>
  symbol ? WBNB_SYMBOLS.has(symbol.toUpperCase()) : false;

const toTokenMetadata = (token: TokenFragment): TokenMetadata => ({
  address: normalizeAddress(token.id),
  symbol: token.symbol ?? "UNKNOWN",
  name: token.name ?? token.symbol ?? "Unknown Token",
  decimals: Number(token.decimals ?? 18) || 18
});

const computePriceUsd = (
  base: TokenMetadata,
  quote: TokenMetadata,
  priceBaseInQuote: number
): number | undefined => {
  if (Number.isNaN(priceBaseInQuote) || priceBaseInQuote <= 0) {
    return undefined;
  }

  if (isStable(quote.symbol)) {
    return priceBaseInQuote;
  }

  if (isStable(base.symbol)) {
    return 1;
  }

  if (isWbnb(base.symbol) && env.priceWbnbUsd) {
    return env.priceWbnbUsd;
  }

  if (isWbnb(quote.symbol) && env.priceWbnbUsd) {
    return priceBaseInQuote * env.priceWbnbUsd;
  }

  return undefined;
};

const fetchPoolDayVolumes = async (
  poolIds: string[]
): Promise<Map<string, number>> => {
  if (!poolIds.length) {
    return new Map();
  }

  const uniqueIds = Array.from(new Set(poolIds.map((id) => normalizeAddress(id))));

  const data = await ponderRequest<PoolDayDataResponse>(POOL_DAY_DATA_QUERY, {
    poolIds: uniqueIds,
    limit: uniqueIds.length * 5
  });

  const map = new Map<string, number>();

  data.poolDayDatas.forEach((entry) => {
    const poolId = entry.pool?.id ? normalizeAddress(entry.pool.id) : null;
    if (!poolId) {
      return;
    }

    const volume = Number(entry.volumeUSD ?? 0);
    if (!Number.isFinite(volume)) {
      return;
    }

    if (!map.has(poolId)) {
      map.set(poolId, volume);
    }
  });

  return map;
};

const buildPoolSnapshot = (
  pool: GraphPool,
  poolDayVolumeMap: Map<string, number>,
  targetTokenAddress?: string
): PoolSnapshot | null => {
  const poolAddress = normalizeAddress(pool.id);

  if (!poolAddress) {
    return null;
  }

  const token0 = toTokenMetadata(pool.token0);
  const token1 = toTokenMetadata(pool.token1);

  const resolvedTarget = targetTokenAddress
    ? normalizeAddress(targetTokenAddress)
    : undefined;

  const targetToken = resolvedTarget
    ? resolvedTarget === token0.address
      ? token0
      : resolvedTarget === token1.address
        ? token1
        : null
    : token0;

  if (!targetToken) {
    return null;
  }

  const priceToken0InToken1 = Number(pool.token0Price ?? 0);
  let priceToken1InToken0 = Number(pool.token1Price ?? 0);
  if (!priceToken1InToken0 && priceToken0InToken1 > 0) {
    priceToken1InToken0 = 1 / priceToken0InToken1;
  }

  const priceToken0Usd = computePriceUsd(token0, token1, priceToken0InToken1);
  const priceToken1Usd = computePriceUsd(token1, token0, priceToken1InToken0);

  const tvlToken0 = Number(pool.totalValueLockedToken0 ?? 0);
  const tvlToken1 = Number(pool.totalValueLockedToken1 ?? 0);
  const totalLiquidityUsd = Number(pool.totalValueLockedUSD ?? 0);

  const baseLiquidity =
    targetToken.address === token0.address ? tvlToken0 : tvlToken1;
  const quoteLiquidity =
    targetToken.address === token0.address ? tvlToken1 : tvlToken0;

  const depthEstimates = [1, 5].map((percent) => ({
    percent,
    baseTokenAmount: baseLiquidity * (percent / 100),
    quoteTokenAmount: quoteLiquidity * (percent / 100),
    usdValue: totalLiquidityUsd * (percent / 100)
  }));

  const priceUsd =
    targetToken.address === token0.address ? priceToken0Usd : priceToken1Usd;

  const volume24hUsd = poolDayVolumeMap.get(poolAddress);
  const rawApr24hPct =
    volume24hUsd !== undefined &&
    volume24hUsd >= MIN_VOLUME_USD_FOR_APR &&
    totalLiquidityUsd >= MIN_TVL_USD_FOR_APR
      ? ((volume24hUsd * (Number(pool.feeTier ?? 0) / 1_000_000)) /
          totalLiquidityUsd) *
        365 *
        100
      : undefined;
  const apr24hPct =
    rawApr24hPct !== undefined &&
    Number.isFinite(rawApr24hPct) &&
    rawApr24hPct > 0
      ? Math.min(rawApr24hPct, MAX_ANNUALIZED_APR_PCT)
      : undefined;

  const createdTimestamp = Number(pool.createdAtTimestamp ?? 0) * 1000;

  return {
    poolId: poolAddress,
    token: targetToken,
    token0,
    token1,
    feeTier: Number(pool.feeTier ?? 0),
    totalLiquidityUsd,
    tvlToken0,
    tvlToken1,
    priceToken0InToken1,
    priceToken0Usd,
    priceToken1Usd,
    priceUsd,
    depthEstimates,
    volume24hUsd,
    volume24hToken0: undefined,
    volume24hToken1: undefined,
    apr24hPct,
    updatedAt:
      Number.isFinite(createdTimestamp) && createdTimestamp > 0
        ? new Date(createdTimestamp).toISOString()
        : new Date().toISOString()
  };
};

const transformPools = (
  pools: GraphPool[] | null | undefined,
  poolDayVolumeMap: Map<string, number>,
  targetTokenAddress?: string
): PoolSnapshot[] =>
  (pools ?? [])
    .map((pool) => buildPoolSnapshot(pool, poolDayVolumeMap, targetTokenAddress))
    .filter((snapshot): snapshot is PoolSnapshot => snapshot !== null)
    .sort((a, b) => b.totalLiquidityUsd - a.totalLiquidityUsd);

export const fetchPoolSummary = async (
  tokenAddress?: string
): Promise<PoolSummary> => {
  const feeTiers =
    env.pancakeFeeTiers.length > 0 ? env.pancakeFeeTiers : SUPPORTED_FEE_TIERS;
  const feeTierVariables = feeTiers.map((tier) => tier.toString());

  const hasToken = typeof tokenAddress === "string" && tokenAddress.trim().length > 0;
  const trimmedToken = hasToken ? normalizeAddress(tokenAddress) : undefined;

  if (hasToken && (!trimmedToken || trimmedToken.length !== 42)) {
    throw new Error("Invalid token address.");
  }

  let rawPools: GraphPool[] = [];
  let snapshotTargetToken: string | undefined = trimmedToken;

  if (trimmedToken) {
    const data = await ponderRequest<PoolsByTokenResponse>(
      POOLS_BY_TOKEN_QUERY,
      {
        token: trimmedToken,
        feeTiers: feeTierVariables,
        limit: DEFAULT_POOL_LIMIT
      }
    );

    rawPools = data.pools ?? [];

    if (!rawPools.length) {
      const poolById = await ponderRequest<PoolByIdResponse>(POOL_BY_ID_QUERY, {
        id: trimmedToken
      });

      if (poolById.pool) {
        rawPools = [poolById.pool];
        snapshotTargetToken = undefined;
      }
    }
  } else {
    const data = await ponderRequest<RecentPoolsResponse>(RECENT_POOLS_QUERY, {
      feeTiers: feeTierVariables,
      limit: DEFAULT_POOL_LIMIT
    });

    rawPools = data.pools ?? [];
  }

  const poolIds = rawPools.map((pool) => pool.id);
  const poolDayVolumeMap = await fetchPoolDayVolumes(poolIds);
  const snapshots = transformPools(
    rawPools,
    poolDayVolumeMap,
    snapshotTargetToken
  );

  const relatedTokenAddresses = Array.from(
    new Set(
      snapshots.flatMap((snapshot) => [
        snapshot.token0.address,
        snapshot.token1.address
      ])
    )
  );

  const resolvedTokenAddress =
    snapshotTargetToken ??
    snapshots[0]?.token.address ??
    trimmedToken ??
    "all";

  return {
    tokenAddress: resolvedTokenAddress,
    pools: snapshots,
    requestedId: trimmedToken,
    relatedTokenAddresses: relatedTokenAddresses.length
      ? relatedTokenAddresses
      : undefined
  };
};
