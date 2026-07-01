"use client";

import { Check, ShieldAlert, Sparkles, RefreshCw, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComponentState } from "./mission-status-card";

interface HistoricalSimilarityCardProps {
  state?: ComponentState;
  onRetry?: () => void;
}

export function HistoricalSimilarityCard({ state = "normal", onRetry }: HistoricalSimilarityCardProps) {
  if (state === "loading") {
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

  if (state === "empty") {
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

  if (state === "error") {
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
                onClick={onRetry}
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

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm h-full flex flex-col justify-between hover:border-border/80 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-cyan" />
            Historical Similarity
          </CardTitle>
          <div className="bg-cyan/15 border border-cyan/35 text-cyan text-[10px] font-mono px-2 py-0.5 rounded font-bold">
            98.4% MATCH
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3.5 text-xs">
        {/* Match Header */}
        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border/20 font-mono">
          <div>
            <span className="text-[10px] text-muted-foreground block uppercase">Current Event</span>
            <span className="text-sm font-bold text-foreground">SOL2026-AR136</span>
            <span className="text-[10px] text-amber block mt-0.5">Class M8.4 (Active)</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block uppercase">Archive Match</span>
            <span className="text-sm font-bold text-foreground">SOL2003-10-28</span>
            <span className="text-[10px] text-red block mt-0.5">Class X17.2 (Halloween)</span>
          </div>
        </div>

        {/* Side-by-Side Parameter Matrix */}
        <div className="space-y-1.5 font-mono text-[10px]">
          <span className="uppercase text-[9px] text-muted-foreground font-semibold">Parameter Comparison</span>
          <div className="grid grid-cols-3 gap-1 py-1 border-b border-border/10">
            <span className="text-muted-foreground">Peak Flux</span>
            <span className="text-foreground text-center">8.4e-5 W/m²</span>
            <span className="text-muted-foreground text-right">1.7e-4 W/m²</span>
          </div>
          <div className="grid grid-cols-3 gap-1 py-1 border-b border-border/10">
            <span className="text-muted-foreground">Rise Duration</span>
            <span className="text-foreground text-center">14m 30s</span>
            <span className="text-muted-foreground text-right">16m 12s</span>
          </div>
          <div className="grid grid-cols-3 gap-1 py-1">
            <span className="text-muted-foreground">Lag Phase</span>
            <span className="text-foreground text-center">2.4s</span>
            <span className="text-muted-foreground text-right">2.8s</span>
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
            <svg className="w-full h-full">
              {/* Historical Match curve (Dashed Grey line) */}
              <path
                d="M 10 45 Q 35 48 55 25 T 95 5 T 135 15 T 180 35 T 220 40 T 260 45"
                fill="none"
                stroke="rgba(113, 113, 122, 0.5)"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              {/* Current Active curve (Solid Blue line) */}
              <path
                d="M 10 45 Q 35 48 55 28 T 95 10 T 135 18 T 180 38"
                fill="none"
                stroke="var(--color-electric-blue)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
