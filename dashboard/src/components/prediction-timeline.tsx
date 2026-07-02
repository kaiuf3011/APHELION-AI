"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ComponentState } from "./mission-status-card";
import { fetchForecastTimeline } from "@/lib/api";

interface PredictionTimelineProps {
  state?: ComponentState;
  onRetry?: () => void;
}

export function PredictionTimeline({ state = "normal", onRetry }: PredictionTimelineProps) {
  const query = useQuery({
    queryKey: ["forecast-timeline"],
    queryFn: fetchForecastTimeline,
    refetchInterval: 5000,
  });

  const effectiveState: ComponentState =
    state !== "normal" ? state : query.isLoading ? "loading" : query.isError ? "error" : "normal";

  if (effectiveState === "loading") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 w-full h-full p-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted/15 border border-border/20 rounded p-4 flex flex-col justify-between h-28 animate-pulse">
            <div className="h-3 w-16 bg-muted/40 rounded" />
            <div className="h-6 w-20 bg-muted/40 rounded" />
            <div className="h-2 w-full bg-muted/40 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (effectiveState === "empty") {
    return (
      <div className="flex flex-col items-center justify-center p-6 w-full h-full min-h-[120px] text-center">
        <Sparkles className="h-6 w-6 text-muted-foreground/30 mb-2" />
        <h4 className="text-xs font-semibold text-muted-foreground">Timeline Standby</h4>
        <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[240px]">
          No flare triggers detected. Monitoring active regions for thermal build-up.
        </p>
      </div>
    );
  }

  if (effectiveState === "error") {
    return (
      <div className="flex flex-col items-center justify-center p-6 w-full h-full min-h-[120px] text-center border border-red/20 rounded bg-red-950/5">
        <ShieldAlert className="h-6 w-6 text-red/60 mb-2 animate-bounce" />
        <h4 className="text-xs font-semibold text-red">Predictor Desync</h4>
        <p className="text-[10px] text-red/60 mt-1 font-mono">
          ERR_TIMELINE_INFERENCE_TIMEOUT: Model prediction window timed out.
        </p>
        {onRetry && (
          <button
            onClick={() => { onRetry(); query.refetch(); }}
            className="mt-3 text-[10px] flex items-center gap-1 px-2.5 py-1 rounded bg-red/10 border border-red/30 text-red hover:bg-red/20 transition-all font-mono"
          >
            <RefreshCw className="h-2.5 w-2.5" /> Re-trigger Predictor
          </button>
        )}
      </div>
    );
  }

  const blocks = query.data?.blocks ?? [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 w-full h-full p-1">
      {blocks.map((block) => {
        const statusColors = {
          nominal: "border-emerald/45 hover:border-emerald/80 bg-emerald-950/5",
          watch: "border-amber/45 hover:border-amber/80 bg-amber-950/5",
          critical: "border-red/45 hover:border-red/80 bg-red-950/5"
        };
        
        const badgeColors = {
          nominal: "bg-emerald/10 text-emerald border-emerald/20",
          watch: "bg-amber/10 text-amber border-amber/20",
          critical: "bg-red/10 text-red border-red/20"
        };

        const textColors = {
          nominal: "text-emerald",
          watch: "text-amber",
          critical: "text-red"
        };

        return (
          <div 
            key={block.leadTime}
            className={`border rounded p-3 flex flex-col justify-between h-full min-h-[110px] transition-all group relative cursor-help ${statusColors[block.status]}`}
          >
            {/* Hover tooltip explanation */}
            <div className="absolute inset-0 bg-zinc-950/95 opacity-0 group-hover:opacity-100 transition-opacity rounded p-2.5 text-[10px] text-muted-foreground flex flex-col justify-between z-10 font-mono">
              <span className="text-foreground font-semibold">Physics Analysis:</span>
              <p className="leading-tight mt-1">{block.reason}</p>
              <div className="flex justify-between border-t border-border/20 pt-1.5 mt-1.5">
                <span>Confidence:</span>
                <span className="text-foreground">{block.confidence}%</span>
              </div>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 font-semibold uppercase">
                <Clock className="h-3 w-3" /> {block.leadTime}
              </span>
              <span className={`text-[9px] px-1 rounded border font-mono ${badgeColors[block.status]}`}>
                P={block.probability}%
              </span>
            </div>

            <div className="mt-2">
              <span className="text-xl font-bold tracking-tight block font-mono">
                {block.expectedClass}
              </span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                Expected Class
              </span>
            </div>

            {/* Custom mini progress bar at bottom of block */}
            <div className="w-full h-1 bg-muted/40 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full ${block.status === "nominal" ? "bg-emerald" : block.status === "watch" ? "bg-amber" : "bg-red"}`}
                style={{ width: `${block.probability}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
