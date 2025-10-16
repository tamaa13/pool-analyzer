import { Badge, Button } from "../atoms";

type PoolsToolbarProps = {
  showInsights: boolean;
  onToggleInsights: () => void;
  insightsEnabled: boolean;
};

export const PoolsToolbar = ({
  showInsights,
  onToggleInsights,
  insightsEnabled
}: PoolsToolbarProps) => (
  <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
    <span className="text-slate-200">All Pools</span>
    <span>Fee Tier</span>
    <span>APR</span>
    <span>TVL</span>
    <span>Volume 24h</span>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onToggleInsights}
      disabled={!insightsEnabled}
      className="ml-auto"
    >
      {showInsights ? "Hide AI" : "Show AI"}
    </Button>
    <Badge variant="default" className="hidden md:block">
      v3 focus
    </Badge>
  </div>
);
