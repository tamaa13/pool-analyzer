import type { InputHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className, ...props }: InputProps) => (
  <input
    className={cn(
      "w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition focus:border-emerald-500 focus:ring-0",
      className
    )}
    {...props}
  />
);
