import { Button, Card, Label, Select } from "../atoms";

export type FilterOption = { value: string; label: string };

export type FiltersPanelProps = {
  filteredCount: number;
  totalCount: number;
  feeTier: string;
  tvl: string;
  apr: string;
  depth: string;
  pairType: string;
  options: {
    feeTier: FilterOption[];
    tvl: FilterOption[];
    apr: FilterOption[];
    depth: FilterOption[];
    pairType: FilterOption[];
  };
  onFeeTierChange: (value: string) => void;
  onTvlChange: (value: string) => void;
  onAprChange: (value: string) => void;
  onDepthChange: (value: string) => void;
  onPairTypeChange: (value: string) => void;
  onReset: () => void;
};

export const FiltersPanel = ({
  filteredCount,
  totalCount,
  feeTier,
  tvl,
  apr,
  depth,
  pairType,
  options,
  onFeeTierChange,
  onTvlChange,
  onAprChange,
  onDepthChange,
  onPairTypeChange,
  onReset
}: FiltersPanelProps) => (
  <Card className="grid gap-4 px-5 py-4 text-xs text-slate-400">
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <span className="font-semibold uppercase tracking-[0.3em] text-slate-200">
        Filters
      </span>
      <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-slate-500">
        <span className="text-slate-200">
          {filteredCount} / {totalCount} pools
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
        >
          Reset
        </Button>
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-5">
      <FilterSelect
        label="Fee Tier"
        value={feeTier}
        options={options.feeTier}
        onValueChange={onFeeTierChange}
      />
      <FilterSelect
        label="TVL"
        value={tvl}
        options={options.tvl}
        onValueChange={onTvlChange}
      />
      <FilterSelect
        label="APR 24h"
        value={apr}
        options={options.apr}
        onValueChange={onAprChange}
      />
      <FilterSelect
        label="Depth ±1%"
        value={depth}
        options={options.depth}
        onValueChange={onDepthChange}
      />
      <FilterSelect
        label="Pair Type"
        value={pairType}
        options={options.pairType}
        onValueChange={onPairTypeChange}
      />
    </div>
  </Card>
);

type FilterSelectProps = {
  label: string;
  value: string;
  options: FilterOption[];
  onValueChange: (value: string) => void;
};

const FilterSelect = ({ label, value, options, onValueChange }: FilterSelectProps) => (
  <label className="flex flex-col gap-2">
    <Label className="uppercase tracking-[0.25em] text-slate-500">
      {label}
    </Label>
    <Select
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  </label>
);
