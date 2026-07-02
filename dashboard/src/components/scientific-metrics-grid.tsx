"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, Target, Clock, Zap, CheckCircle2, ShieldAlert, Sparkles, RefreshCw, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ComponentState } from "./mission-status-card";
import { fetchMetrics, MetricGridItem } from "@/lib/api";

// Icon per metric id, since the API doesn't send icon components
const ICONS: Record<string, LucideIcon> = {
  acc: CheckCircle2,
  lead: Clock,
  prec: Target,
  rec: Target,
  far: Shield,
  tpr: CheckCircle2,
};

// Helper sub-component for numerical count-up animation
function AnimatedCounter({ value, decimals = 1 }: { value: number; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;

    const duration = 1200; // ms
    const increment = end / (duration / 16); // ~60fps
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setDisplayValue(end);
      } else {
        setDisplayValue(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <>{displayValue.toFixed(decimals)}</>;
}

interface ScientificMetricsGridProps {
  state?: ComponentState;
  onRetry?: () => void;
}

export function ScientificMetricsGrid({ state = "normal", onRetry }: ScientificMetricsGridProps) {
  const query = useQuery({
    queryKey: ["metrics"],
    queryFn: fetchMetrics,
    refetchInterval: 30000,
  });

  const effectiveState: ComponentState =
    state !== "normal" ? state : query.isLoading ? "loading" : query.isError ? "error" : "normal";

  if (effectiveState === "loading") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full p-1 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-muted/15 border border-border/20 rounded p-4 h-24 flex flex-col justify-between">
            <div className="h-3 w-2/3 bg-muted/40 rounded" />
            <div className="h-6 w-16 bg-muted/40 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (effectiveState === "empty") {
    return (
      <div className="flex flex-col items-center justify-center p-6 w-full h-full min-h-[140px] text-center border border-dashed border-border/40 rounded-lg">
        <Sparkles className="h-6 w-6 text-muted-foreground/30 mb-2" />
        <h4 className="text-xs font-semibold text-muted-foreground">Calibration Metrics Pending</h4>
        <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[280px]">
          Waiting for test sequences to compile validation recall and precision coefficients.
        </p>
      </div>
    );
  }

  if (effectiveState === "error") {
    return (
      <div className="flex flex-col items-center justify-center p-6 w-full h-full min-h-[140px] text-center border border-red/20 rounded bg-red-950/5">
        <ShieldAlert className="h-6 w-6 text-red/60 mb-2 animate-bounce" />
        <h4 className="text-xs font-semibold text-red">Metrics Compute Timeout</h4>
        <p className="text-[10px] text-red/60 mt-1 font-mono">
          ERR_METRICS_AGGREGATION: Validation dataset file lock conflict.
        </p>
        {onRetry && (
          <button
            onClick={() => { onRetry(); query.refetch(); }}
            className="mt-3 text-[10px] flex items-center gap-1 px-2.5 py-1 rounded bg-red/10 border border-red/30 text-red hover:bg-red/20 transition-all font-mono"
          >
            <RefreshCw className="h-2.5 w-2.5" /> Re-aggregate Metrics
          </button>
        )}
      </div>
    );
  }

  const metricsList = query.data?.grid ?? [];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full p-1">
      {metricsList.map((metric: MetricGridItem) => {
        const Icon = ICONS[metric.id] ?? CheckCircle2;

        return (
          <Card
            key={metric.id}
            className="bg-card/30 border border-border/40 hover:border-border/80 hover:bg-card/50 transition-all flex flex-col justify-between"
          >
            <CardContent className="p-3.5 flex flex-col justify-between h-full min-h-[95px]">
              {/* Card Label & Icon */}
              <div className="flex items-center gap-2 text-muted-foreground justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider block leading-tight">
                  {metric.name}
                </span>
                <div className="p-1 rounded bg-muted/40 text-muted-foreground shrink-0">
                  <Icon className="h-3 w-3" />
                </div>
              </div>

              {/* Card Value & Trend */}
              <div className="flex items-end justify-between mt-3">
                <span className="text-xl font-bold tracking-tight font-mono text-foreground flex items-baseline">
                  {metric.isTime ? (
                    <>
                      <AnimatedCounter value={metric.value} decimals={0} />
                      <span className="text-xs font-semibold text-muted-foreground ml-0.5">{metric.suffix}</span>
                    </>
                  ) : (
                    <>
                      <AnimatedCounter value={metric.value} decimals={metric.decimals} />
                      <span className="text-xs font-semibold text-muted-foreground ml-0.5">{metric.suffix}</span>
                    </>
                  )}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  —
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
