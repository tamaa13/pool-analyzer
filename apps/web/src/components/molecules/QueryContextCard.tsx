import { Card, Label } from "../atoms";

type QueryContextCardProps = {
  requestedId: string;
  resolvedTokens: string;
};

export const QueryContextCard = ({
  requestedId,
  resolvedTokens
}: QueryContextCardProps) => (
  <Card className="grid gap-4 px-5 py-4 text-xs text-slate-400 md:grid-cols-5">
    <span className="font-semibold uppercase tracking-[0.35em] text-slate-200">
      Query Context
    </span>
    <div className="flex flex-col gap-1 md:col-span-2">
      <Label className="uppercase tracking-[0.25em] text-slate-500">
        Requested ID
      </Label>
      <code className="break-all rounded-md bg-slate-900 px-2 py-1 text-[11px] text-slate-200">
        {requestedId}
      </code>
    </div>
    <div className="flex flex-col gap-1 md:col-span-2">
      <Label className="uppercase tracking-[0.25em] text-slate-500">
        Resolved Tokens
      </Label>
      <span className="text-[11px] text-slate-200">{resolvedTokens}</span>
    </div>
  </Card>
);
