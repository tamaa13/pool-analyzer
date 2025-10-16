"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  AiInsight,
  AnalyzeResponse,
  PoolSnapshot,
  PoolSummary,
  TokenSearchResult
} from "@shared/index";
import { Badge } from "../components/atoms";
import {
  FiltersPanel,
  OverviewCard,
  QueryContextCard,
  SearchForm
} from "../components/molecules";
import {
  LoadingOverlay,
  PoolsTable,
  PoolsToolbar
} from "../components/organisms";
import {
  aprOptions,
  depthOptions,
  feeTierOptions,
  stableOptions,
  tvlOptions,
  type AprFilter,
  type DepthFilter,
  type FeeTierFilter,
  type StableFilter,
  type TvlFilter
} from "../constants/filters";
import { apiFetch } from "../utils/apiClient";

type PoolsAndAnalysis = {
  summary: PoolSummary | null;
  analysis: AnalyzeResponse | null;
};

const initialToken = "";

const STABLE_SYMBOLS = new Set([
  "USDT",
  "USDC",
  "BUSD",
  "DAI",
  "FDUSD",
  "TUSD"
]);

const isStableSymbol = (symbol?: string | null) =>
  symbol ? STABLE_SYMBOLS.has(symbol.toUpperCase()) : false;

const isStablePool = (pool: PoolSnapshot) =>
  isStableSymbol(pool.token0.symbol) || isStableSymbol(pool.token1.symbol);

export default function HomePage() {
  const [searchInput, setSearchInput] = useState(initialToken);
  const [{ summary, analysis }, setData] = useState<PoolsAndAnalysis>({
    summary: null,
    analysis: null
  });
  const [resolvedQuery, setResolvedQuery] = useState<{
    address: string;
    label: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(true);
  const [suggestions, setSuggestions] = useState<TokenSearchResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [copiedPoolId, setCopiedPoolId] = useState<string | null>(null);

  const [feeTierFilter, setFeeTierFilter] = useState<FeeTierFilter>("all");
  const [tvlFilter, setTvlFilter] = useState<TvlFilter>("all");
  const [aprFilter, setAprFilter] = useState<AprFilter>("all");
  const [depthFilter, setDepthFilter] = useState<DepthFilter>("all");
  const [stableFilter, setStableFilter] = useState<StableFilter>("all");

  const pools = useMemo<PoolSnapshot[]>(() => summary?.pools ?? [], [summary]);

  const aiInsightMap = useMemo(() => {
    const map = new Map<string, AiInsight>();
    (analysis?.aiInsights ?? []).forEach((insight) => {
      map.set(insight.id, insight);
    });
    return map;
  }, [analysis]);

  const relatedSymbols = useMemo(() => {
    if (!pools.length) {
      return [];
    }
    return Array.from(
      new Set(
        pools.flatMap((pool) => [pool.token0.symbol, pool.token1.symbol])
      )
    ).filter(Boolean);
  }, [pools]);

  const filteredPools = useMemo(() => {
    return pools.filter((pool) => {
      const feeTierPct = (pool.feeTier / 10_000).toFixed(2) as FeeTierFilter;
      const tvl = pool.totalLiquidityUsd;
      const apr = pool.apr24hPct ?? 0;
      const depth1Usd =
        pool.depthEstimates.find((estimate) => estimate.percent === 1)?.usdValue ??
        0;
      const stable = isStablePool(pool);

      const feeTierMatch =
        feeTierFilter === "all" ? true : feeTierPct === feeTierFilter;

      const tvlMatch =
        tvlFilter === "all"
          ? true
          : tvlFilter === "lt_100k"
            ? tvl < 100_000
            : tvlFilter === "100k_1m"
              ? tvl >= 100_000 && tvl <= 1_000_000
              : tvl > 1_000_000;

      const aprMatch =
        aprFilter === "all"
          ? true
          : aprFilter === "lt_5"
            ? apr < 5
            : aprFilter === "5_20"
              ? apr >= 5 && apr <= 20
              : apr > 20;

      const depthMatch =
        depthFilter === "all"
          ? true
          : depthFilter === "lt_10k"
            ? depth1Usd < 10_000
            : depthFilter === "10k_50k"
              ? depth1Usd >= 10_000 && depth1Usd <= 50_000
              : depth1Usd > 50_000;

      const stableMatch =
        stableFilter === "all"
          ? true
          : stableFilter === "stable_only"
            ? stable
            : !stable;

      return feeTierMatch && tvlMatch && aprMatch && depthMatch && stableMatch;
    });
  }, [pools, feeTierFilter, tvlFilter, aprFilter, depthFilter, stableFilter]);

  useEffect(() => {
    setSearchInput(initialToken);
    setResolvedQuery(null);
  }, []);

  const loadDefaultPools = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/pools");

      if (!response.ok) {
        throw new Error(
          `Default pool request failed (${response.status} ${response.statusText})`
        );
      }

      const poolData: PoolSummary = await response.json();

      const uniqueTokens = Array.from(
        new Set(
          (poolData.pools ?? [])
            .map((pool) => pool.token.address)
            .filter(Boolean)
        )
      );

      const analyses: AnalyzeResponse[] = [];

      for (const address of uniqueTokens) {
        try {
          const analyzeRes = await apiFetch(`/api/analyze/${address}`);
          if (!analyzeRes.ok) {
            continue;
          }
          const analyzeData: AnalyzeResponse = await analyzeRes.json();
          analyses.push(analyzeData);
        } catch (error) {
          console.error("Failed to analyze default token", error);
        }
      }

      const combinedAnalysis: AnalyzeResponse | null =
        analyses.length > 0
          ? buildCombinedAnalysis(analyses)
          : null;

      setData({
        summary: poolData,
        analysis: combinedAnalysis
      });
      setResolvedQuery(null);
      setSuggestions([]);
      setSearchInput(initialToken);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the default pool list."
      );
      setResolvedQuery(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDefaultPools();
  }, [loadDefaultPools]);

  useEffect(() => {
    const query = searchInput.trim();

    if (!query || (query.startsWith("0x") && query.length <= 3)) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      if (query.startsWith("0x") && query.length === 42) {
        setSuggestions([]);
        return;
      }

      try {
        setSuggestionsLoading(true);
        const response = await apiFetch(
          `/api/tokens/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            `Token search failed (${response.status} ${response.statusText})`
          );
        }

        const data: { tokens: TokenSearchResult[] } = await response.json();
        setSuggestions(data.tokens ?? []);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSuggestionsLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchInput]);

  const resolveTokenQuery = useCallback(
    async (query: string): Promise<{ address: string; label: string } | null> => {
      const trimmed = query.trim();
      const normalized = trimmed.toLowerCase();

      if (
        resolvedQuery &&
        (resolvedQuery.label.toLowerCase() === trimmed.toLowerCase() ||
          resolvedQuery.address === normalized)
      ) {
        return resolvedQuery;
      }

      if (trimmed.startsWith("0x") && trimmed.length === 42) {
        return {
          address: normalized,
          label: trimmed
        };
      }

      const cached =
        suggestions.find(
          (item) =>
            item.symbol?.toLowerCase() === trimmed.toLowerCase() ||
            item.address === normalized
        ) ?? suggestions[0];

      if (cached) {
        return {
          address: cached.address,
          label: cached.symbol || cached.address
        };
      }

      try {
        const response = await apiFetch(
          `/api/tokens/search?q=${encodeURIComponent(trimmed)}`
        );

        if (!response.ok) {
          throw new Error(
            `Token search failed (${response.status} ${response.statusText})`
          );
        }

        const data: { tokens: TokenSearchResult[] } = await response.json();
        const match = data.tokens?.[0];

        if (!match) {
          return null;
        }

        return {
          address: match.address,
          label: match.symbol || match.address
        };
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    [resolvedQuery, suggestions]
  );

  const handleCopyPool = async (poolId?: string) => {
    if (!poolId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(poolId);
      setCopiedPoolId(poolId);
      setTimeout(() => setCopiedPoolId(null), 1500);
    } catch (err) {
      console.error("Failed to copy pool address", err);
    }
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) {
      await loadDefaultPools();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resolved = await resolveTokenQuery(trimmed);

      if (!resolved) {
        throw new Error(
          "Token not found. Enter a valid address or symbol."
        );
      }

      setSearchInput(resolved.label);
      setResolvedQuery(resolved);
      setSuggestions([]);

      const [poolRes, analyzeRes] = await Promise.all([
        apiFetch(`/api/pools/${resolved.address}`),
        apiFetch(`/api/analyze/${resolved.address}`)
      ]);

      if (!poolRes.ok) {
        throw new Error(
          `Pool request failed (${poolRes.status} ${poolRes.statusText})`
        );
      }

      if (!analyzeRes.ok) {
        throw new Error(
          `Analysis request failed (${analyzeRes.status} ${analyzeRes.statusText})`
        );
      }

      const poolData: PoolSummary = await poolRes.json();
      const analyzeData: AnalyzeResponse = await analyzeRes.json();

      setData({
        summary: poolData,
        analysis: analyzeData
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to load token insights."
      );
      setData({ summary: null, analysis: null });
      setResolvedQuery(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionSelect = (suggestion: TokenSearchResult) => {
    const label = suggestion.symbol || suggestion.address;
    setSearchInput(label);
    setResolvedQuery({
      address: suggestion.address,
      label
    });
    setSuggestions([]);
  };

  const handleFeeTierChange = useCallback(
    (value: string) => setFeeTierFilter(value as FeeTierFilter),
    []
  );
  const handleTvlChange = useCallback(
    (value: string) => setTvlFilter(value as TvlFilter),
    []
  );
  const handleAprChange = useCallback(
    (value: string) => setAprFilter(value as AprFilter),
    []
  );
  const handleDepthChange = useCallback(
    (value: string) => setDepthFilter(value as DepthFilter),
    []
  );
  const handlePairTypeChange = useCallback(
    (value: string) => setStableFilter(value as StableFilter),
    []
  );

  const handleResetFilters = () => {
    setFeeTierFilter("all");
    setTvlFilter("all");
    setAprFilter("all");
    setDepthFilter("all");
    setStableFilter("all");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {loading && <LoadingOverlay message="Loading" />}
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-16 pt-12 md:px-10">
        <header className="grid gap-6 rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Badge>
                  <span className="h-2 w-2 rounded-full bg-purple-400" />
                  BNB Smart Chain
                </Badge>
                <Badge variant="outline">v0.1.0</Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                PancakeSwap Pool Analyzer
              </h1>
              <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
                Explore PancakeSwap v3 liquidity in real time, compare fee tiers,
                and surface AI insights to support routing decisions.
              </p>
            </div>

            <SearchForm
              value={searchInput}
              onChange={setSearchInput}
              onSubmit={handleSubmit}
              onSuggestionSelect={handleSuggestionSelect}
              suggestions={suggestions}
              suggestionsLoading={suggestionsLoading}
              loading={loading}
            />
          </div>

          {summary?.requestedId && summary.requestedId !== summary.tokenAddress && (
            <QueryContextCard
              requestedId={summary.requestedId}
              resolvedTokens={
                relatedSymbols.length
                  ? relatedSymbols.join(", ")
                  : analysis?.token.symbol || summary.tokenAddress
              }
            />
          )}

          <OverviewCard title="Overview">
            {analysis?.summary ??
              "Enter a token address to retrieve PancakeSwap v3 liquidity insights."}
          </OverviewCard>

          <FiltersPanel
            filteredCount={filteredPools.length}
            totalCount={pools.length}
            feeTier={feeTierFilter}
            tvl={tvlFilter}
            apr={aprFilter}
            depth={depthFilter}
            pairType={stableFilter}
            options={{
              feeTier: feeTierOptions,
              tvl: tvlOptions,
              apr: aprOptions,
              depth: depthOptions,
              pairType: stableOptions
            }}
            onFeeTierChange={handleFeeTierChange}
            onTvlChange={handleTvlChange}
            onAprChange={handleAprChange}
            onDepthChange={handleDepthChange}
            onPairTypeChange={handlePairTypeChange}
            onReset={handleResetFilters}
          />
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/60 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="flex flex-col gap-4">
          <PoolsToolbar
            showInsights={showInsights}
            onToggleInsights={() => setShowInsights((prev) => !prev)}
            insightsEnabled={Boolean(analysis)}
          />

          <PoolsTable
            pools={filteredPools}
            aiInsights={aiInsightMap}
            showInsights={showInsights}
            copiedPoolId={copiedPoolId}
            onCopyPool={handleCopyPool}
          />
        </section>
      </section>
    </main>
  );
}

const buildCombinedAnalysis = (analyses: AnalyzeResponse[]): AnalyzeResponse => {
  const flattenedInsights = analyses
    .flatMap((item) => item.aiInsights ?? [])
    .filter(Boolean);

  const uniqueOpportunities = Array.from(
    new Set(analyses.flatMap((item) => item.opportunities ?? []))
  ).slice(0, 5);

  const uniqueRisks = Array.from(
    new Set(analyses.flatMap((item) => item.risks ?? []))
  ).slice(0, 5);

  const averageHealthScore =
    analyses.reduce(
      (sum, item) => sum + (item.liquidityHealth?.score ?? 0),
      0
    ) / analyses.length;

  const healthLabel =
    averageHealthScore >= 75
      ? "strong"
      : averageHealthScore >= 50
        ? "moderate"
        : "weak";

  const aggregatedFactors = Array.from(
    new Map(
      analyses
        .flatMap((item) => item.liquidityHealth?.factors ?? [])
        .filter((factor) => Boolean(factor.detail))
        .map((factor) => [`${factor.type}-${factor.detail}`, factor])
    ).values()
  ).slice(0, 6);

  const tokenSymbols = analyses
    .map((item) => item.token.symbol || item.token.address)
    .filter(Boolean)
    .slice(0, 3);

  return {
    token: {
      address: "multiple",
      symbol: "ALL",
      name: "Aggregated Pools",
      decimals: 18
    },
    summary: `Default analysis covers ${analyses.length} tokens (e.g., ${tokenSymbols.join(", ")}). Average health score ${Math.round(
      averageHealthScore
    )} (${healthLabel}).`,
    opportunities: uniqueOpportunities,
    risks: uniqueRisks,
    aiInsights: flattenedInsights,
    liquidityHealth: {
      score: Math.round(averageHealthScore),
      label: healthLabel,
      summary: `Average score ${Math.round(
        averageHealthScore
      )} across ${analyses.length} analyzed tokens.`,
      factors: aggregatedFactors
    },
    generatedAt: new Date().toISOString()
  };
};
