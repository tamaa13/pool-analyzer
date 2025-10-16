import type { PoolSnapshot } from "@shared/index";

const stripTrailingZeros = (value: string) =>
  value.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");

const formatWithSuffix = (value: number, divisor: number, suffix: string) => {
  const base = value / divisor;
  const decimals = base >= 100 ? 0 : base >= 10 ? 1 : 2;
  return `${stripTrailingZeros(base.toFixed(decimals))}${suffix}`;
};

export const formatUsd = (value: number | undefined) => {
  if (value === undefined || Number.isNaN(value)) {
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

export const formatPair = (pool: PoolSnapshot) =>
  `${pool.token0.symbol}/${pool.token1.symbol}`;

export const formatAddress = (address: string): string => {
  if (!address) {
    return "";
  }

  if (address.length <= 10) {
    return address;
  }

  return `${address.slice(0, 5)}...${address.slice(-3)}`;
};

export const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export const summariseFallback = (pool: PoolSnapshot) => {
  const apr =
    pool.apr24hPct !== undefined
      ? percentFormatter.format((pool.apr24hPct ?? 0) / 100)
      : "APR n/a";

  return `${formatPair(pool)} holds ${formatUsd(
    pool.totalLiquidityUsd
  )} at the ${(pool.feeTier / 10_000).toFixed(
    2
  )}% fee tier with APR ${apr}.`;
};
