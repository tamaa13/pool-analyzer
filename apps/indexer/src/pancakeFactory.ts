import { eq } from "@ponder/core";
import { ponder } from "@/generated";
import { formatUnits } from "viem";
import { erc20Abi } from "./abis/ERC20";
import { pancakeV3PoolAbi } from "./abis/PancakeV3Pool";
import * as schema from "../ponder.schema";

const STABLE_SYMBOLS = new Set([
  "USDT",
  "USDC",
  "BUSD",
  "DAI",
  "FDUSD",
  "TUSD"
]);

const WBNB_SYMBOLS = new Set(["WBNB", "BNB"]);
const HOUR_IN_SECONDS = 60 * 60;
const DAY_IN_SECONDS = HOUR_IN_SECONDS * 24;
const PRICE_WBNB_USD = Number(process.env.PRICE_WBNB_USD ?? "0");

type TokenRecord = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
};

type PoolRecord = {
  address: string;
  token0: TokenRecord;
  token1: TokenRecord;
  fee: number;
  tickSpacing: number;
};

const tokenCache = new Map<string, TokenRecord>();
const poolCache = new Map<string, PoolRecord>();

const isStable = (symbol?: string | null) =>
  symbol ? STABLE_SYMBOLS.has(symbol.toUpperCase()) : false;

const isWbnb = (symbol?: string | null) =>
  symbol ? WBNB_SYMBOLS.has(symbol.toUpperCase()) : false;

const computePriceUsd = (
  base: TokenRecord,
  quote: TokenRecord,
  priceBaseInQuote: number
): number | undefined => {
  if (!Number.isFinite(priceBaseInQuote) || priceBaseInQuote <= 0) {
    return undefined;
  }

  if (isStable(quote.symbol)) {
    return priceBaseInQuote;
  }

  if (isStable(base.symbol)) {
    return 1;
  }

  if (isWbnb(base.symbol) && PRICE_WBNB_USD > 0) {
    return PRICE_WBNB_USD;
  }

  if (isWbnb(quote.symbol) && PRICE_WBNB_USD > 0) {
    return priceBaseInQuote * PRICE_WBNB_USD;
  }

  return undefined;
};

const ensureToken = async (
  context: Parameters<
    (typeof ponder)["on"]
  >[0]["1"]["context"],
  address: string
): Promise<TokenRecord> => {
  const lower = address.toLowerCase();
  const cached = tokenCache.get(lower);
  if (cached) {
    return cached;
  }

  let symbol = "UNKNOWN";
  let name = "Unknown Token";
  let decimals = 18;

  try {
    const [fetchedSymbol, fetchedName, fetchedDecimals] = await Promise.all([
      context.client.readContract({
        abi: erc20Abi,
        address: lower as `0x${string}`,
        functionName: "symbol"
      }),
      context.client.readContract({
        abi: erc20Abi,
        address: lower as `0x${string}`,
        functionName: "name"
      }),
      context.client.readContract({
        abi: erc20Abi,
        address: lower as `0x${string}`,
        functionName: "decimals"
      })
    ]);

    symbol = String(fetchedSymbol ?? "UNKNOWN");
    name = String(fetchedName ?? "Unknown Token");
    decimals = Number(fetchedDecimals ?? 18);
  } catch (error) {
    // keep defaults on read failure
  }

  const record: TokenRecord = {
    address: lower,
    symbol,
    name,
    decimals
  };

  await context.db
    .insert(schema.Token)
    .values(record)
    .onConflictDoNothing();

  tokenCache.set(lower, record);

  return record;
};

const ensurePoolRecord = async (
  context: Parameters<
    (typeof ponder)["on"]
  >[0]["1"]["context"],
  poolAddress: string
): Promise<PoolRecord | null> => {
  const lower = poolAddress.toLowerCase();
  const cached = poolCache.get(lower);
  if (cached) {
    return cached;
  }

  const rows = await context.db
    .select()
    .from(schema.Pool)
    .where(eq(schema.Pool.address, lower))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  const [token0, token1] = await Promise.all([
    ensureToken(context, row.token0Address),
    ensureToken(context, row.token1Address)
  ]);

  const record: PoolRecord = {
    address: lower,
    token0,
    token1,
    fee: Number(row.fee ?? 0),
    tickSpacing: Number(row.tickSpacing ?? 0)
  };

  poolCache.set(lower, record);

  return record;
};

const normalizeEventId = (event: { log: { id: string } }) => event.log.id;

const toNumber = (value?: string | number | null): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const makeBucketId = (poolAddress: string, bucketStart: number) =>
  `${poolAddress}-${bucketStart}`;

const refreshPoolMetrics = async (
  context: Parameters<
    (typeof ponder)["on"]
  >[0]["1"]["context"],
  pool: PoolRecord,
  timestamp: number,
  blockNumber: bigint
) => {
  const poolAddress = pool.address as `0x${string}`;

  const [slot0, liquidityRaw, balance0, balance1] = await Promise.all([
    context.client.readContract({
      abi: pancakeV3PoolAbi,
      address: poolAddress,
      functionName: "slot0"
    }),
    context.client.readContract({
      abi: pancakeV3PoolAbi,
      address: poolAddress,
      functionName: "liquidity"
    }),
    context.client.readContract({
      abi: erc20Abi,
      address: pool.token0.address as `0x${string}`,
      functionName: "balanceOf",
      args: [poolAddress]
    }),
    context.client.readContract({
      abi: erc20Abi,
      address: pool.token1.address as `0x${string}`,
      functionName: "balanceOf",
      args: [poolAddress]
    })
  ]);

  const sqrtPriceX96 = slot0[0] as bigint;
  const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96;
  const decimalAdjustment =
    Math.pow(10, pool.token1.decimals) / Math.pow(10, pool.token0.decimals);
  const priceToken0InToken1 = sqrtPrice * sqrtPrice * decimalAdjustment;
  const priceToken1InToken0 =
    priceToken0InToken1 > 0 ? 1 / priceToken0InToken1 : 0;

  const priceToken0Usd = computePriceUsd(
    pool.token0,
    pool.token1,
    priceToken0InToken1
  );
  const priceToken1Usd = computePriceUsd(
    pool.token1,
    pool.token0,
    priceToken1InToken0
  );

  const tvlToken0 = Number(formatUnits(balance0, pool.token0.decimals));
  const tvlToken1 = Number(formatUnits(balance1, pool.token1.decimals));

  const liquidityUsdParts: number[] = [];

  if (priceToken0Usd !== undefined) {
    liquidityUsdParts.push(tvlToken0 * priceToken0Usd);
  }

  if (priceToken1Usd !== undefined) {
    liquidityUsdParts.push(tvlToken1 * priceToken1Usd);
  }

  const totalLiquidityUsd = liquidityUsdParts.reduce(
    (accumulator, value) => accumulator + value,
    0
  );

  const cutoff = timestamp - DAY_IN_SECONDS;

  const currentBucketStart =
    Math.floor(timestamp / HOUR_IN_SECONDS) * HOUR_IN_SECONDS;
  const minBucketStart =
    Math.floor(cutoff / HOUR_IN_SECONDS) * HOUR_IN_SECONDS;

  let volume24hToken0 = 0;
  let volume24hToken1 = 0;
  let volume24hUsd = 0;

  for (
    let bucketStart = minBucketStart;
    bucketStart <= currentBucketStart;
    bucketStart += HOUR_IN_SECONDS
  ) {
    const bucket = await context.db.find(schema.PoolVolumeBucket, {
      id: makeBucketId(pool.address, bucketStart)
    });

    if (!bucket) {
      continue;
    }

    volume24hToken0 += toNumber(bucket.amount0);
    volume24hToken1 += toNumber(bucket.amount1);
    volume24hUsd += toNumber(bucket.amountUsd);
  }

  await context.db
    .insert(schema.PoolMetric)
    .values({
      poolAddress: pool.address,
      sqrtPriceX96: sqrtPriceX96.toString(),
      liquidity: (liquidityRaw as bigint).toString(),
      tvlToken0: tvlToken0.toString(),
      tvlToken1: tvlToken1.toString(),
      totalLiquidityUsd: totalLiquidityUsd.toString(),
      priceToken0Usd:
        priceToken0Usd !== undefined ? priceToken0Usd.toString() : null,
      priceToken1Usd:
        priceToken1Usd !== undefined ? priceToken1Usd.toString() : null,
      volume24hToken0: volume24hToken0.toString(),
      volume24hToken1: volume24hToken1.toString(),
      volume24hUsd: volume24hUsd.toString(),
      updatedAt: timestamp,
      blockNumber: Number(blockNumber)
    })
    .onConflictDoUpdate({
      target: schema.PoolMetric.poolAddress,
      set: {
        sqrtPriceX96: sqrtPriceX96.toString(),
        liquidity: (liquidityRaw as bigint).toString(),
        tvlToken0: tvlToken0.toString(),
        tvlToken1: tvlToken1.toString(),
        totalLiquidityUsd: totalLiquidityUsd.toString(),
        priceToken0Usd:
          priceToken0Usd !== undefined ? priceToken0Usd.toString() : null,
        priceToken1Usd:
          priceToken1Usd !== undefined ? priceToken1Usd.toString() : null,
        volume24hToken0: volume24hToken0.toString(),
        volume24hToken1: volume24hToken1.toString(),
        volume24hUsd: volume24hUsd.toString(),
        updatedAt: timestamp,
        blockNumber: Number(blockNumber)
      }
    });
};

const handleLiquidityChange = async (
  context: Parameters<
    (typeof ponder)["on"]
  >[0]["1"]["context"],
  poolAddress: string,
  timestamp: number,
  blockNumber: bigint
) => {
  const pool = await ensurePoolRecord(context, poolAddress);
  if (!pool) {
    return;
  }

  await refreshPoolMetrics(context, pool, timestamp, blockNumber);
};

ponder.on("pancakeFactory:PoolCreated", async ({ event, context }) => {
  const { token0, token1, fee, tickSpacing, pool } = event.args;
  const token0Address = token0.toLowerCase();
  const token1Address = token1.toLowerCase();
  const poolAddress = pool.toLowerCase();
  const blockTimestamp = Number(event.block.timestamp);

  const [token0Entity, token1Entity] = await Promise.all([
    ensureToken(context, token0Address),
    ensureToken(context, token1Address)
  ]);

  await context.db
    .insert(schema.Pool)
    .values({
      address: poolAddress,
      token0Address: token0Entity.address,
      token1Address: token1Entity.address,
      fee: Number(fee),
      tickSpacing: Number(tickSpacing),
      createdAt: blockTimestamp
    })
    .onConflictDoNothing();

  poolCache.set(poolAddress, {
    address: poolAddress,
    token0: token0Entity,
    token1: token1Entity,
    fee: Number(fee),
    tickSpacing: Number(tickSpacing)
  });

  await refreshPoolMetrics(
    context,
    {
      address: poolAddress,
      token0: token0Entity,
      token1: token1Entity,
      fee: Number(fee),
      tickSpacing: Number(tickSpacing)
    },
    blockTimestamp,
    event.block.number
  );
});

ponder.on("pancakePool:Mint", async ({ event, context }) => {
  const poolAddress = event.log.address.toLowerCase();
  const timestamp = Number(event.block.timestamp);

  await handleLiquidityChange(context, poolAddress, timestamp, event.block.number);
});

ponder.on("pancakePool:Burn", async ({ event, context }) => {
  const poolAddress = event.log.address.toLowerCase();
  const timestamp = Number(event.block.timestamp);

  await handleLiquidityChange(context, poolAddress, timestamp, event.block.number);
});

ponder.on("pancakePool:Collect", async ({ event, context }) => {
  const poolAddress = event.log.address.toLowerCase();
  const timestamp = Number(event.block.timestamp);

  await handleLiquidityChange(context, poolAddress, timestamp, event.block.number);
});

ponder.on("pancakePool:CollectProtocol", async ({ event, context }) => {
  const poolAddress = event.log.address.toLowerCase();
  const timestamp = Number(event.block.timestamp);

  await handleLiquidityChange(context, poolAddress, timestamp, event.block.number);
});

ponder.on("pancakePool:Flash", async ({ event, context }) => {
  const poolAddress = event.log.address.toLowerCase();
  const timestamp = Number(event.block.timestamp);

  await handleLiquidityChange(context, poolAddress, timestamp, event.block.number);
});

ponder.on("pancakePool:Swap", async ({ event, context }) => {
  const poolAddress = event.log.address.toLowerCase();
  const timestamp = Number(event.block.timestamp);
  const pool = await ensurePoolRecord(context, poolAddress);

  if (!pool) {
    return;
  }

  const { amount0, amount1, sqrtPriceX96 } = event.args;

  const amount0Formatted = Number(
    formatUnits(amount0 as bigint, pool.token0.decimals)
  );
  const amount1Formatted = Number(
    formatUnits(amount1 as bigint, pool.token1.decimals)
  );

  const absAmount0 = Math.abs(amount0Formatted);
  const absAmount1 = Math.abs(amount1Formatted);

  const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96;
  const decimalAdjustment =
    Math.pow(10, pool.token1.decimals) / Math.pow(10, pool.token0.decimals);
  const priceToken0InToken1 = sqrtPrice * sqrtPrice * decimalAdjustment;
  const priceToken1InToken0 =
    priceToken0InToken1 > 0 ? 1 / priceToken0InToken1 : 0;

  const priceToken0Usd = computePriceUsd(
    pool.token0,
    pool.token1,
    priceToken0InToken1
  );
  const priceToken1Usd = computePriceUsd(
    pool.token1,
    pool.token0,
    priceToken1InToken0
  );

  const usdParts: number[] = [];

  if (priceToken0Usd !== undefined) {
    usdParts.push(absAmount0 * priceToken0Usd);
  }

  if (priceToken1Usd !== undefined) {
    usdParts.push(absAmount1 * priceToken1Usd);
  }

  const amountUsd = usdParts.reduce((acc, value) => acc + value, 0);

  const bucketStart = Math.floor(timestamp / 3600) * 3600;
  const bucketId = makeBucketId(poolAddress, bucketStart);

  const existingBucket = await context.db.find(schema.PoolVolumeBucket, {
    id: bucketId
  });

  if (existingBucket) {
    const nextAmount0 = toNumber(existingBucket.amount0) + absAmount0;
    const nextAmount1 = toNumber(existingBucket.amount1) + absAmount1;
    const nextAmountUsd = toNumber(existingBucket.amountUsd) + amountUsd;

    await context.db
      .update(schema.PoolVolumeBucket, { id: bucketId })
      .set({
        amount0: nextAmount0.toString(),
        amount1: nextAmount1.toString(),
        amountUsd: nextAmountUsd.toString(),
        updatedAt: timestamp
      });
  } else {
    await context.db
      .insert(schema.PoolVolumeBucket)
      .values({
        id: bucketId,
        poolAddress,
        bucketStart,
        amount0: absAmount0.toString(),
        amount1: absAmount1.toString(),
        amountUsd: amountUsd.toString(),
        updatedAt: timestamp
      })
      .onConflictDoNothing();
  }

  await refreshPoolMetrics(context, pool, timestamp, event.block.number);
});
