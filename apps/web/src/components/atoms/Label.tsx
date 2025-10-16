import type { LabelHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export const Label = ({ className, ...props }: LabelProps) => (
  <label
    className={cn(
      "text-xs font-medium uppercase tracking-[0.3em] text-slate-500",
      className
    )}
    {...props}
  />
);
