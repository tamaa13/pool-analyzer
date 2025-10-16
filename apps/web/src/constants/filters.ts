export type FeeTierFilter = "all" | "0.01" | "0.05" | "0.25" | "1.00";
export type TvlFilter = "all" | "lt_100k" | "100k_1m" | "gt_1m";
export type AprFilter = "all" | "lt_5" | "5_20" | "gt_20";
export type DepthFilter = "all" | "lt_10k" | "10k_50k" | "gt_50k";
export type StableFilter = "all" | "stable_only" | "volatile_only";

export const feeTierOptions: Array<{ value: FeeTierFilter; label: string }> = [
  { value: "all", label: "All tiers" },
  { value: "0.01", label: "0.01%" },
  { value: "0.05", label: "0.05%" },
  { value: "0.25", label: "0.25%" },
  { value: "1.00", label: "1.00%" }
];

export const tvlOptions: Array<{ value: TvlFilter; label: string }> = [
  { value: "all", label: "Any TVL" },
  { value: "lt_100k", label: "< $100k" },
  { value: "100k_1m", label: "$100k - $1M" },
  { value: "gt_1m", label: "> $1M" }
];

export const aprOptions: Array<{ value: AprFilter; label: string }> = [
  { value: "all", label: "Any APR" },
  { value: "lt_5", label: "< 5%" },
  { value: "5_20", label: "5% - 20%" },
  { value: "gt_20", label: "> 20%" }
];

export const depthOptions: Array<{ value: DepthFilter; label: string }> = [
  { value: "all", label: "Any depth" },
  { value: "lt_10k", label: "< $10k" },
  { value: "10k_50k", label: "$10k - $50k" },
  { value: "gt_50k", label: "> $50k" }
];

export const stableOptions: Array<{ value: StableFilter; label: string }> = [
  { value: "all", label: "Any pair" },
  { value: "stable_only", label: "Stable pairs" },
  { value: "volatile_only", label: "Volatile pairs" }
];
