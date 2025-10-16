import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

type BadgeVariant = "default" | "outline" | "glow" | "subtle";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClassName: Record<BadgeVariant, string> = {
  default:
    "border border-purple-500/40 bg-purple-500/10 text-purple-200",
  outline:
    "border border-slate-700 bg-transparent text-slate-200",
  glow:
    "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  subtle:
    "border border-slate-800 bg-slate-900 text-slate-400"
};

export const Badge = ({ variant = "default", className, children, ...props }: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.35em]",
      variantClassName[variant],
      className
    )}
    {...props}
  >
    {children}
  </span>
);
