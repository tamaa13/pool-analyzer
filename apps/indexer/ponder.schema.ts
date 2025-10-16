import { onchainTable } from "@ponder/core";

export const Token = onchainTable("token", (p) => ({
  address: p.hex().primaryKey(),
  symbol: p.text(),
  name: p.text(),
  decimals: p.integer()
}));

export const Pool = onchainTable("pool", (p) => ({
  address: p.hex().primaryKey(),
  token0Address: p.hex().notNull(),
  token1Address: p.hex().notNull(),
  fee: p.integer().notNull(),
  tickSpacing: p.integer().notNull(),
  createdAt: p.integer().notNull()
}));

export const PoolMetric = onchainTable("pool_metric", (p) => ({
  poolAddress: p.hex().primaryKey(),
  sqrtPriceX96: p.text(),
  liquidity: p.text(),
  tvlToken0: p.text(),
  tvlToken1: p.text(),
  totalLiquidityUsd: p.text(),
  priceToken0Usd: p.text(),
  priceToken1Usd: p.text(),
  volume24hToken0: p.text(),
  volume24hToken1: p.text(),
  volume24hUsd: p.text(),
  updatedAt: p.integer(),
  blockNumber: p.integer()
}));

export const PoolSwap = onchainTable("pool_swap", (p) => ({
  id: p.text().primaryKey(),
  poolAddress: p.hex().notNull(),
  amount0: p.text().notNull(),
  amount1: p.text().notNull(),
  amountUsd: p.text().notNull(),
  timestamp: p.integer().notNull(),
  blockNumber: p.integer().notNull()
}));

export const PoolVolumeBucket = onchainTable("pool_volume_bucket", (p) => ({
  id: p.text().primaryKey(),
  poolAddress: p.hex().notNull(),
  bucketStart: p.integer().notNull(),
  amount0: p.text().notNull(),
  amount1: p.text().notNull(),
  amountUsd: p.text().notNull(),
  updatedAt: p.integer().notNull()
}));
