import type { ReactNode } from "react";
import { Spinner } from "../atoms";

type LoadingOverlayProps = {
  message?: ReactNode;
};

export const LoadingOverlay = ({ message = "Loading" }: LoadingOverlayProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-3 text-slate-200">
      <Spinner />
      <span className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-200">
        {message}
      </span>
    </div>
  </div>
);
