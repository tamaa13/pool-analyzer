import type { AiInsight, PoolSnapshot } from "@shared/index";
import { Badge } from "../atoms";
import {
  formatAddress,
  formatPair,
  formatUsd,
  percentFormatter,
  summariseFallback
} from "../../utils/format";

const SENTIMENT_STYLES: Record<
  AiInsight["sentiment"],
  { container: string; label: string; text: string; badge: string }
> = {
  bullish: {
    container: "border-emerald-500/20 bg-emerald-500/5",
    label: "text-emerald-300",
    text: "text-emerald-100",
    badge: "!border-emerald-500/40 !bg-emerald-500/10 !text-emerald-200"
  },
  neutral: {
    container: "border-slate-500/20 bg-slate-500/5",
    label: "text-slate-300",
    text: "text-slate-100",
    badge: "!border-slate-500/40 !bg-slate-500/10 !text-slate-200"
  },
  bearish: {
    container: "border-rose-500/20 bg-rose-500/5",
    label: "text-rose-300",
    text: "text-rose-100",
    badge: "!border-rose-500/40 !bg-rose-500/10 !text-rose-200"
  }
};

type PoolsTableProps = {
  pools: PoolSnapshot[];
  aiInsights: Map<string, AiInsight>;
  showInsights: boolean;
  copiedPoolId: string | null;
  onCopyPool: (poolId: string) => void;
};

export const PoolsTable = ({
  pools,
  aiInsights,
  showInsights,
  copiedPoolId,
  onCopyPool
}: PoolsTableProps) => (
  <div className="overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-950/60">
    <div className="hidden grid-cols-[minmax(0,4fr)_repeat(4,minmax(0,2fr))] gap-4 border-b border-slate-800 bg-slate-950/80 px-6 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 md:grid">
      <span>Pool</span>
      <span>Fee Tier</span>
      <span>APR (24h)</span>
      <span>TVL</span>
      <span>Volume 24h</span>
    </div>

    {pools.length === 0 ? (
      <div className="px-6 py-12 text-center text-sm text-slate-500">
        No pools match the current filters. Adjust filters or search for another token.
      </div>
    ) : (
      <div className="divide-y divide-slate-800/70">
        {pools.map((pool, index) =>
          renderPoolRow({
            pool,
            index,
            aiInsights,
            showInsights,
            copiedPoolId,
            onCopyPool
          })
        )}
      </div>
    )}
  </div>
);

type RowProps = {
  pool: PoolSnapshot;
  index: number;
  aiInsights: Map<string, AiInsight>;
  showInsights: boolean;
  copiedPoolId: string | null;
  onCopyPool: (poolId: string) => void;
};

const renderPoolRow = ({
  pool,
  index,
  aiInsights,
  showInsights,
  copiedPoolId,
  onCopyPool
}: RowProps) => {
  const insightKey =
    (pool.poolId ? `${pool.poolId}-${pool.feeTier}` : null) ??
    `${pool.token.address}-${pool.feeTier}`;
  const insight = aiInsights.get(insightKey);
  const aprValue = pool.apr24hPct;
  const aprUnavailable = aprValue === undefined;
  const aprDisplay = !aprUnavailable
    ? percentFormatter.format((aprValue ?? 0) / 100)
    : "n/a";
  const sentimentStyle = insight
    ? SENTIMENT_STYLES[insight.sentiment]
    : null;

  return (
    <article
      key={`${pool.token.address}-${pool.feeTier}-${index}`}
      className="grid gap-4 px-4 py-5 md:grid-cols-[minmax(0,4fr)_repeat(4,minmax(0,2fr))] md:px-6"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-sm font-semibold text-slate-200">
            {pool.token0.symbol.slice(0, 3)}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-slate-50">
              {formatPair(pool)}
            </p>
            {pool.poolId && (
              <button
                type="button"
                onClick={() => onCopyPool(pool.poolId!)}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500 transition hover:text-emerald-200 cursor-pointer"
              >
                <span>BNB Chain</span>
                <span className="font-mono text-[11px] tracking-[0.2em] text-slate-400">
                  {copiedPoolId === pool.poolId
                    ? "Copied!"
                    : formatAddress(pool.poolId)}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="block text-xs uppercase tracking-[0.3em] text-slate-500 md:hidden">
          Fee Tier
        </span>
        <Badge className="w-fit border-purple-500/40 bg-purple-500/10 text-purple-100">
          v3 · {(pool.feeTier / 10_000).toFixed(2)}%
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        <span className="block text-xs uppercase tracking-[0.3em] text-slate-500 md:hidden">
          APR
        </span>
        <div className="group relative w-fit" tabIndex={aprUnavailable ? 0 : -1}>
          <span
            className={`text-sm font-semibold ${
              aprUnavailable ? "text-slate-400" : "text-emerald-300"
            }`}
          >
            {aprDisplay}
          </span>
          {aprUnavailable && (
            <>
              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-md bg-slate-900 px-3 py-2 text-[11px] text-slate-100 opacity-0 shadow-lg ring-1 ring-slate-700/60 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
                APR is unavailable because 24h volume and TVL are below the minimum thresholds.
              </span>
              <span className="pointer-events-none absolute left-1/2 top-full z-10 h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-slate-900 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100" />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="block text-xs uppercase tracking-[0.3em] text-slate-500 md:hidden">
          TVL
        </span>
        <span className="text-sm font-semibold text-slate-100">
          {formatUsd(pool.totalLiquidityUsd)}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="block text-xs uppercase tracking-[0.3em] text-slate-500 md:hidden">
          Volume 24h
        </span>
        <span className="text-sm font-semibold text-slate-100">
          {formatUsd(pool.volume24hUsd)}
        </span>
      </div>

      <div className="md:col-span-5">
        <div className="grid gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/70 px-4 py-4 md:grid-cols-4">
          <div className="md:col-span-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Liquidity Depth
            </p>
          </div>
          {pool.depthEstimates.map((depth, depthIndex) => (
            <div
              key={`${pool.token.address}-${pool.feeTier}-${depth.percent}-${depthIndex}`}
              className="flex flex-col gap-1 rounded-xl border border-slate-800/60 bg-slate-950/80 p-3 text-xs text-slate-300"
            >
              <span className="font-semibold text-slate-100">
                ±{depth.percent}% slippage
              </span>
              <span>
                {depth.baseTokenAmount.toFixed(2)} base · {formatUsd(depth.usdValue)}
              </span>
            </div>
          ))}
        </div>

        {showInsights && insight && sentimentStyle && (
          <div
            className={`mt-4 rounded-2xl border ${sentimentStyle.container} p-4`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-xs uppercase tracking-[0.3em] ${sentimentStyle.label}`}
              >
                AI Insight
              </span>
              <Badge
                variant="glow"
                className={`px-2 py-0.5 text-[10px] ${sentimentStyle.badge}`}
              >
                {insight.sentiment}
              </Badge>
            </div>
            <p className={`mt-2 text-sm ${sentimentStyle.text}`}>
              {insight.rationale ?? summariseFallback(pool)}
            </p>
          </div>
        )}
      </div>
    </article>
  );
};
