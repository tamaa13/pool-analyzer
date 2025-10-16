import { Button, Input } from "../../atoms";
import { cn } from "../../utils/cn";
import type { SearchFormProps } from "./SearchForm.types";

export const SearchForm = ({
  value,
  onChange,
  onSubmit,
  onSuggestionSelect,
  suggestions,
  suggestionsLoading,
  loading
}: SearchFormProps) => (
  <form
    onSubmit={onSubmit}
    className="relative flex w-full flex-col gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4 md:max-w-sm"
  >
    <div className="flex flex-col gap-2">
      <label
        className="text-xs font-medium uppercase tracking-[0.3em] text-slate-500"
        htmlFor="tokenAddress"
      >
        Token Address or Symbol
      </label>
      <div className="relative flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2">
        <Input
          id="tokenAddress"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Address, symbol, or token name"
          className="border-none bg-transparent px-0 py-0"
        />
        {suggestionsLoading && (
          <span className="text-xs text-slate-500">Loading…</span>
        )}
        {suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/95 text-sm shadow-2xl">
            {suggestions.map((item) => (
              <li
                key={item.address}
                className="border-b border-slate-800/60 last:border-none"
              >
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col gap-1 px-4 py-3 text-left transition",
                    "hover:bg-slate-900/70"
                  )}
                  onClick={() => onSuggestionSelect(item)}
                >
                  <span className="text-sm font-semibold text-slate-100">
                    {item.symbol || "UNKNOWN"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {item.name || "PancakeSwap Token"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {item.address}
                  </span>
                  {typeof item.liquidityUsd === "number" && (
                    <span className="text-[11px] text-emerald-300">
                      TVL ${Math.round(item.liquidityUsd).toLocaleString()}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
    <Button type="submit" disabled={loading}>
      {loading ? "Loading analysis…" : "Analyze Token"}
    </Button>
  </form>
);
