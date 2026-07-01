"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Target, Clock, Zap, CheckCircle2, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ComponentState } from "./mission-status-card";

interface MetricItem {
  id: string;
  name: string;
  targetValue: number;
  suffix: string;
  isTime?: boolean;
  trend: string;
  icon: any;
  decimals: number;
}

const metricsList: MetricItem[] = [
  { id: "acc", name: "Prediction Accuracy", targetValue: 94.2, suffix: "%", trend: "+1.2%", icon: CheckCircle2, decimals: 1 },
  { id: "lead", name: "Median Lead Time", targetValue: 42, suffix: "m 15s", isTime: true, trend: "+5m", icon: Clock, decimals: 0 },
  { id: "prec", name: "Model Precision", targetValue: 91.8, suffix: "%", trend: "+0.8%", icon: Target, decimals: 1 },
  { id: "rec", name: "Model Recall", targetValue: 93.5, suffix: "%", trend: "+1.5%", icon: Target, decimals: 1 },
  { id: "far", name: "False Alarm Rate", targetValue: 0.08, suffix: "%", trend: "-0.02%", icon: Shield, decimals: 2 },
  { id: "tpr", name: "True Positive Rate", targetValue: 96.1, suffix: "%", trend: "+0.4%", icon: CheckCircle2, decimals: 1 }
];

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
  if (state === "loading") {
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

  if (state === "empty") {
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

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center p-6 w-full h-full min-h-[140px] text-center border border-red/20 rounded bg-red-950/5">
        <ShieldAlert className="h-6 w-6 text-red/60 mb-2 animate-bounce" />
        <h4 className="text-xs font-semibold text-red">Metrics Compute Timeout</h4>
        <p className="text-[10px] text-red/60 mt-1 font-mono">
          ERR_METRICS_AGGREGATION: Validation dataset file lock conflict.
        </p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="mt-3 text-[10px] flex items-center gap-1 px-2.5 py-1 rounded bg-red/10 border border-red/30 text-red hover:bg-red/20 transition-all font-mono"
          >
            <RefreshCw className="h-2.5 w-2.5" /> Re-aggregate Metrics
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full p-1">
      {metricsList.map((metric) => {
        const Icon = metric.icon;
        
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
                      <AnimatedCounter value={metric.targetValue} decimals={0} />
                      <span className="text-xs font-semibold text-muted-foreground ml-0.5">{metric.suffix}</span>
                    </>
                  ) : (
                    <>
                      <AnimatedCounter value={metric.targetValue} decimals={metric.decimals} />
                      <span className="text-xs font-semibold text-muted-foreground ml-0.5">{metric.suffix}</span>
                    </>
                  )}
                </span>
                <span className={`text-[10px] font-mono ${
                  metric.trend.startsWith("+") 
                    ? metric.id === "far" ? "text-emerald" : "text-emerald"
                    : "text-red"
                }`}>
                  {metric.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
