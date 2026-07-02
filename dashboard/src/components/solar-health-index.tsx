"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ComponentState } from "./mission-status-card";
import { fetchHealthIndex } from "@/lib/api";

interface SolarHealthIndexProps {
  state?: ComponentState;
  onRetry?: () => void;
}

export function SolarHealthIndex({ state = "normal", onRetry }: SolarHealthIndexProps) {
  const [override, setOverride] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ["health-index"],
    queryFn: fetchHealthIndex,
    refetchInterval: 5000,
  });

  const indexValue = override ?? query.data?.value ?? 0;

  const effectiveState: ComponentState =
    state !== "normal" ? state : query.isLoading ? "loading" : query.isError ? "error" : "normal";

  // Detemine colors and label based on percentage
  const getIndexConfig = (val: number) => {
    if (val <= 30) {
      return {
        label: "Quiet",
        color: "text-emerald",
        stroke: "var(--color-emerald)",
        shadow: "rgba(16,185,129,0.4)",
        desc: "Solar activity low. Magnetic fields relaxed.",
      };
    } else if (val <= 50) {
      return {
        label: "Watch",
        color: "text-cyan",
        stroke: "var(--color-cyan)",
        shadow: "rgba(6,182,212,0.4)",
        desc: "Minor active regions detected. Monitoring flux.",
      };
    } else if (val <= 75) {
      return {
        label: "Warning",
        color: "text-amber",
        stroke: "var(--color-amber)",
        shadow: "rgba(245,158,11,0.4)",
        desc: "Significant magnetic shear. M-class flare risk elevated.",
      };
    } else {
      return {
        label: "Critical",
        color: "text-red",
        stroke: "var(--color-red)",
        shadow: "rgba(239,68,68,0.4)",
        desc: "Active reconnection detected. X-class flare imminent.",
      };
    }
  };

  const currentConfig = getIndexConfig(indexValue);
  const circumference = 2 * Math.PI * 65; // Radius = 65
  const strokeDashoffset = circumference - (indexValue / 100) * circumference;

  if (effectiveState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center p-4 w-full h-full min-h-[220px]">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="w-full h-full animate-spin opacity-20">
            <circle
              cx="80"
              cy="80"
              r="65"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray="40 180"
            />
          </svg>
          <div className="absolute h-8 w-16 bg-muted/40 rounded animate-pulse" />
        </div>
        <div className="h-3 w-28 bg-muted/40 rounded animate-pulse mt-4" />
      </div>
    );
  }

  if (effectiveState === "empty") {
    return (
      <div className="flex flex-col items-center justify-center p-4 w-full h-full min-h-[220px] text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground/40 mb-2 animate-pulse" />
        <h4 className="text-xs font-semibold text-muted-foreground">Index Standby</h4>
        <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[180px]">
          No active regions targeted. Sensor calibration in progress.
        </p>
      </div>
    );
  }

  if (effectiveState === "error") {
    return (
      <div className="flex flex-col items-center justify-center p-4 w-full h-full min-h-[220px] text-center border border-red/20 rounded-lg bg-red-950/5">
        <ShieldAlert className="h-8 w-8 text-red/60 mb-2 animate-bounce" />
        <h4 className="text-xs font-semibold text-red">Sensor Error</h4>
        <p className="text-[10px] text-red/60 mt-1 max-w-[180px] font-mono">
          ERR_SHI_CALIBRATION_FAIL: Helium sensor calibration timed out.
        </p>
        {onRetry && (
          <button
            onClick={() => { onRetry(); query.refetch(); }}
            className="mt-3 text-[10px] flex items-center gap-1 px-2 py-1 rounded bg-red/10 border border-red/30 text-red hover:bg-red/20 transition-all"
          >
            <RefreshCw className="h-2.5 w-2.5" /> Force Reset
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-2 w-full">
      <div className="relative flex items-center justify-center w-40 h-40">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-electric-blue)" stopOpacity="0.2" />
              <stop offset="100%" stopColor={currentConfig.stroke} stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle
            cx="80"
            cy="80"
            r="65"
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            className="text-muted/10"
          />
          {/* Animated Gauge */}
          <motion.circle
            cx="80"
            cy="80"
            r="65"
            stroke="url(#gaugeGradient)"
            strokeWidth="10"
            fill="transparent"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              filter: `drop-shadow(0 0 6px ${currentConfig.shadow})`,
            }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <Activity className={`h-5 w-5 ${currentConfig.color} mb-1 animate-pulse`} />
          <span className="text-3xl font-mono font-bold tracking-tighter text-foreground">
            {indexValue}%
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${currentConfig.color} mt-0.5`}>
            {currentConfig.label}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-center max-w-[220px] mt-3 min-h-[2.5rem]">
        {currentConfig.desc}
      </p>

      {/* Simulator Buttons */}
      <div className="mt-4 flex flex-col items-center w-full max-w-[220px]">
        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
          Simulator Controls
        </span>
        <div className="grid grid-cols-4 gap-1 w-full text-[9px] font-mono">
          <button
            onClick={() => setOverride(15)}
            className={`py-1 rounded border text-center transition-all ${
              indexValue <= 30
                ? "bg-emerald/20 border-emerald/50 text-emerald font-semibold"
                : "border-border/30 hover:bg-muted text-muted-foreground"
            }`}
          >
            QUIET
          </button>
          <button
            onClick={() => setOverride(42)}
            className={`py-1 rounded border text-center transition-all ${
              indexValue > 30 && indexValue <= 50
                ? "bg-cyan/20 border-cyan/50 text-cyan font-semibold"
                : "border-border/30 hover:bg-muted text-muted-foreground"
            }`}
          >
            WATCH
          </button>
          <button
            onClick={() => setOverride(65)}
            className={`py-1 rounded border text-center transition-all ${
              indexValue > 50 && indexValue <= 75
                ? "bg-amber/20 border-amber/50 text-amber font-semibold"
                : "border-border/30 hover:bg-muted text-muted-foreground"
            }`}
          >
            WARN
          </button>
          <button
            onClick={() => setOverride(88)}
            className={`py-1 rounded border text-center transition-all ${
              indexValue > 75
                ? "bg-red/20 border-red/50 text-red font-semibold"
                : "border-border/30 hover:bg-muted text-muted-foreground"
            }`}
          >
            CRIT
          </button>
        </div>
      </div>
    </div>
  );
}
