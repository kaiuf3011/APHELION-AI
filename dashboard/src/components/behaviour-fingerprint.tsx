"use client";

import { TrendingUp, TrendingDown, Minus, Info, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ComponentState } from "./mission-status-card";

interface Metric {
  name: string;
  value: string;
  trend: "up" | "down" | "stable";
  trendVal: string;
  status: "nominal" | "watch" | "critical";
  sparklinePoints: string; // SVG path points
  description: string;
}

const metrics: Metric[] = [
  { 
    name: "HXR→SXR Lag", 
    value: "2.4s", 
    trend: "down", 
    trendVal: "-0.3s",
    status: "watch", 
    sparklinePoints: "M 0 16 Q 8 20 16 10 T 32 4 T 48 18 T 64 2", 
    description: "Time delay between peak Hard X-ray and Soft X-ray emission. Short lag indicates high chromospheric evaporation speed." 
  },
  { 
    name: "Rise Velocity", 
    value: "450 km/s", 
    trend: "up", 
    trendVal: "+42 km/s",
    status: "critical", 
    sparklinePoints: "M 0 18 L 10 16 L 20 12 L 30 15 L 40 5 L 50 1 L 64 0", 
    description: "Rate of plasma ascension during the impulsive phase. Velocity > 400 km/s is correlated with CME formation." 
  },
  { 
    name: "Cross Correlation", 
    value: "0.89", 
    trend: "stable", 
    trendVal: "0.00",
    status: "nominal", 
    sparklinePoints: "M 0 10 L 15 11 L 30 9 L 45 10 L 64 10", 
    description: "Correlation coefficient between SoLEXS SXR and HEL1OS HXR profiles. High correlation confirms standard Neupert effect." 
  },
  { 
    name: "Peak Ratio", 
    value: "3.2", 
    trend: "up", 
    trendVal: "+0.4",
    status: "watch", 
    sparklinePoints: "M 0 15 Q 12 18 24 10 T 48 8 T 64 4", 
    description: "Ratio of peak Soft X-ray flux to Hard X-ray flux. Determines thermal conversion efficiency in active loops." 
  },
  { 
    name: "Thermal Delay", 
    value: "12m", 
    trend: "stable", 
    trendVal: "0m",
    status: "nominal", 
    sparklinePoints: "M 0 10 L 15 10 L 30 11 L 45 9 L 64 10", 
    description: "Delay in peak thermal emission following reconnection. Shorter delays suggest compressed magnetic geometries." 
  },
  { 
    name: "Event Duration", 
    value: "45m", 
    trend: "up", 
    trendVal: "+5m",
    status: "nominal", 
    sparklinePoints: "M 0 16 Q 16 10 32 14 T 64 4", 
    description: "Total forecast duration of the active flare event from initial trigger to baseline recovery." 
  },
];

interface BehaviourFingerprintProps {
  state?: ComponentState;
  onRetry?: () => void;
}

export function BehaviourFingerprint({ state = "normal", onRetry }: BehaviourFingerprintProps) {
  if (state === "loading") {
    return (
      <div className="space-y-4 w-full p-1 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center h-8">
            <div className="space-y-1">
              <div className="h-3 w-20 bg-muted/40 rounded" />
              <div className="h-2.5 w-12 bg-muted/40 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-muted/40 rounded" />
              <div className="h-5 w-5 bg-muted/40 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="flex flex-col items-center justify-center p-6 w-full h-full min-h-[220px] text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <h4 className="text-xs font-semibold text-muted-foreground">Fingerprint Standby</h4>
        <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[180px]">
          Waiting for active event trigger to extract behaviour parameters.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center p-6 w-full h-full min-h-[220px] text-center border border-red/20 rounded bg-red-950/5">
        <ShieldAlert className="h-8 w-8 text-red/60 mb-2 animate-bounce" />
        <h4 className="text-xs font-semibold text-red">Signature Extraction Error</h4>
        <p className="text-[10px] text-red/60 mt-1 font-mono">
          ERR_FINGERPRINT_CORRELATION: Matrix singularity encountered during lag computation.
        </p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="mt-3 text-[10px] flex items-center gap-1 px-2.5 py-1 rounded bg-red/10 border border-red/30 text-red hover:bg-red/20 transition-all font-mono"
          >
            <RefreshCw className="h-2.5 w-2.5" /> Recalculate
          </button>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3.5 w-full p-1">
        {metrics.map((metric) => {
          const statusColors = {
            nominal: "text-emerald stroke-emerald bg-emerald/10",
            watch: "text-amber stroke-amber bg-amber/10",
            critical: "text-red stroke-red bg-red/10"
          };

          const textColors = {
            nominal: "text-emerald",
            watch: "text-amber",
            critical: "text-red"
          };

          return (
            <div key={metric.name} className="flex justify-between items-center group">
              {/* Metric Label & Info Hover */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                  <span>{metric.name}</span>
                  <Tooltip>
                    <TooltipTrigger className="text-muted-foreground/60 hover:text-foreground cursor-help transition-colors">
                      <Info className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-zinc-950 text-muted-foreground border border-border/80 text-[10px] max-w-[200px] leading-relaxed p-2 font-sans shadow-lg">
                      <p>{metric.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-mono text-muted-foreground">{metric.value}</span>
                  <span className={`text-[9px] font-mono ${
                    metric.trend === 'up' ? 'text-amber' : 
                    metric.trend === 'down' ? 'text-emerald' : 
                    'text-muted-foreground'
                  }`}>
                    {metric.trendVal}
                  </span>
                </div>
              </div>
              
              {/* Sparkline & Status Icon */}
              <div className="flex items-center gap-3">
                {/* SVG Sparkline */}
                <div className="h-6 w-16 rounded overflow-hidden relative opacity-60 group-hover:opacity-100 transition-opacity">
                  <svg className="w-full h-full">
                    <path
                      d={metric.sparklinePoints}
                      fill="none"
                      stroke={metric.status === 'critical' ? 'var(--color-red)' : metric.status === 'watch' ? 'var(--color-amber)' : 'var(--color-emerald)'}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Status Indicator Badge */}
                <div className={`flex items-center justify-center p-1 rounded-full ${statusColors[metric.status]}`}>
                  {metric.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                  {metric.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                  {metric.trend === 'stable' && <Minus className="h-3 w-3" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
