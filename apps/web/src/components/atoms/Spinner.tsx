import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type SpinnerProps = HTMLAttributes<HTMLDivElement>;

export const Spinner = ({ className, ...props }: SpinnerProps) => (
  <div
    className={cn(
      "h-12 w-12 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent",
      className
    )}
    {...props}
  />
);
