import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-2xl border border-slate-800/70 bg-slate-950/70 shadow-lg shadow-slate-950/20",
      className
    )}
    {...props}
  />
);
