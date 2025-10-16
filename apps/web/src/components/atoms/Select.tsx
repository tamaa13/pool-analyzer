import type { SelectHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = ({ className, ...props }: SelectProps) => (
  <select
    className={cn(
      "rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-emerald-500 focus:ring-0",
      className
    )}
    {...props}
  />
);
