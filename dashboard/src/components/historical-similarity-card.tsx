"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ShieldAlert, Sparkles, RefreshCw, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComponentState } from "./mission-status-card";
import { fetchHistorySimilar } from "@/lib/api";

interface HistoricalSimilarityCardProps {
  state?: ComponentState;
  onRetry?: () => void;
}

// Converts a 0-1 normalized curve into an SVG path matching the card's mini-graph viewBox (~260x50)
function curveToPath(curve: number[], width = 260, height = 50): string {
  if (!curve || curve.length < 2) return `M 10 ${height / 2} L ${width - 10} ${height / 2}`;
  const usableWidth = width - 20;
  const step = usableWidth / (curve.length - 1);
  return curve
    .map((v, i) => {
      const clamped = Math.max(0, Math.min(1, v));
      const x = 10 + i * step;
      const y = height - 5 - clamped * (height - 10);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function HistoricalSimilarityCard({ state = "normal", onRetry }: HistoricalSimilarityCardProps) {
  const query = useQuery({
    queryKey: ["history-similar"],
    queryFn: fetchHistorySimilar,
    refetchInterval: 5000,
  });

  const effectiveState: ComponentState =
    state !== "normal" ? state : query.isLoading ? "loading" : query.isError ? "error" : "normal";

  if (effectiveState === "loading") {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm h-full flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="h-4 w-36 bg-muted/40 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col justify-center">
          <div className="h-12 w-full bg-muted/40 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-3 w-5/6 bg-muted/40 rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-muted/40 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (effectiveState === "empty") {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm h-full flex flex-col justify-center items-center p-6 text-center">
        <Layers className="h-8 w-8 text-muted-foreground/30 mb-2 animate-pulse" />
        <h4 className="text-sm font-semibold text-muted-foreground">Historical Sync Standby</h4>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px]">
          No active flare shape to match. Awaiting flare peak trigger.
        </p>
      </Card>
    );
  }

  if (effectiveState === "error") {
    return (
      <Card className="border-red/40 bg-red-950/10 backdrop-blur-sm h-full flex flex-col justify-center p-6 border">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-red">Archive Query Failed</h3>
            <p className="text-xs text-red/80 font-mono">
              ERR_DB_QUERY_TIMEOUT: Connection timeout while querying historical database index.
            </p>
            {onRetry && (
              <button
                onClick={() => { onRetry(); query.refetch(); }}
                className="mt-3 text-xs flex items-center gap-1.5 px-2.5 py-1 rounded bg-red/20 hover:bg-red/35 text-red transition-all border border-red/30"
              >
                <RefreshCw className="h-3 w-3" /> Retry Query
              </button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  const data = query.data;
  const current = data?.current;
  const match = data?.match;

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm h-full flex flex-col justify-between hover:border-border/80 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-cyan" />
            Historical Similarity
          </CardTitle>
          <div className="bg-cyan/15 border border-cyan/35 text-cyan text-[10px] font-mono px-2 py-0.5 rounded font-bold">
            {(data?.similarity_pct ?? 0).toFixed(1)}% MATCH
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3.5 text-xs">
        {/* Match Header */}
        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border/20 font-mono">
          <div>
            <span className="text-[10px] text-muted-foreground block uppercase">Current Event</span>
            <span className="text-sm font-bold text-foreground">{current?.id ?? "--"}</span>
            <span className="text-[10px] text-amber block mt-0.5">Class {current?.goes_class ?? "--"} (Active)</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block uppercase">Archive Match</span>
            <span className="text-sm font-bold text-foreground">{match?.id ?? "--"}</span>
            <span className="text-[10px] text-red block mt-0.5">Class {match?.goes_class ?? "--"}</span>
          </div>
        </div>

        {/* Side-by-Side Parameter Matrix */}
        <div className="space-y-1.5 font-mono text-[10px]">
          <span className="uppercase text-[9px] text-muted-foreground font-semibold">Parameter Comparison</span>
          <div className="grid grid-cols-3 gap-1 py-1 border-b border-border/10">
            <span className="text-muted-foreground">Peak Flux</span>
            <span className="text-foreground text-center">{current?.peak_flux ?? "--"}</span>
            <span className="text-muted-foreground text-right">{match?.peak_flux ?? "--"}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 py-1 border-b border-border/10">
            <span className="text-muted-foreground">Rise Duration</span>
            <span className="text-foreground text-center">{current?.rise_duration ?? "--"}</span>
            <span className="text-muted-foreground text-right">{match?.rise_duration ?? "--"}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 py-1">
            <span className="text-muted-foreground">Lag Phase</span>
            <span className="text-foreground text-center">{current?.lag ?? "--"}</span>
            <span className="text-muted-foreground text-right">{match?.lag ?? "--"}</span>
          </div>
        </div>

        {/* Mini Profile Graph Overlay */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground uppercase">
            <span>Profile Shape Correlation</span>
            <div className="flex gap-2">
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-electric-blue inline-block"></span> Active</span>
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-zinc-500 border-t border-dashed inline-block"></span> Match</span>
            </div>
          </div>
          <div className="h-14 bg-muted/15 border border-border/20 rounded p-1 flex items-center justify-center relative">
            <svg className="w-full h-full" viewBox="0 0 260 50" preserveAspectRatio="none">
              {/* Historical Match curve (Dashed Grey line) */}
              <path
                d={curveToPath(match?.curve ?? [])}
                fill="none"
                stroke="rgba(113, 113, 122, 0.5)"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              {/* Current Active curve (Solid Blue line) */}
              <path
                d={curveToPath(current?.curve ?? [])}
                fill="none"
                stroke="var(--color-electric-blue)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          </div>
          {data?.data_source && (
            <p className="text-[9px] text-muted-foreground/60 font-mono text-right">{data.data_source}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
