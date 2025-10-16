import type { ReactNode } from "react";
import { Card } from "../atoms";

type OverviewCardProps = {
  title: string;
  children: ReactNode;
};

export const OverviewCard = ({ title, children }: OverviewCardProps) => (
  <Card className="grid gap-4 px-5 py-4 text-xs uppercase text-slate-400 md:grid-cols-5">
    <span className="font-semibold tracking-[0.3em] text-slate-200">
      {title}
    </span>
    <div className="md:col-span-4 text-sm normal-case text-slate-300">
      {children}
    </div>
  </Card>
);
