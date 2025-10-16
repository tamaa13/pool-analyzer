import type { ButtonHTMLAttributes, ForwardedRef, ReactNode } from "react";
import { forwardRef } from "react";
import { cn } from "../utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
};

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-400 text-slate-950 hover:bg-emerald-300 disabled:bg-emerald-500/60 disabled:text-slate-700",
  secondary:
    "bg-slate-900 text-slate-200 border border-slate-700 hover:border-emerald-400/60 hover:text-emerald-200",
  ghost:
    "bg-transparent text-slate-200 hover:bg-slate-900/60 border border-transparent hover:border-slate-800",
  outline:
    "border border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-400 hover:text-emerald-200"
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: "px-3 py-1 text-xs rounded-full",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-5 py-3 text-base rounded-2xl"
};

const ButtonComponent = (
  { variant = "primary", size = "md", className, icon, children, ...props }: ButtonProps,
  ref: ForwardedRef<HTMLButtonElement>
) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.3em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed",
      variantClassName[variant],
      sizeClassName[size],
      className
    )}
    {...props}
  >
    {icon}
    {children}
  </button>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(ButtonComponent);
Button.displayName = "Button";
