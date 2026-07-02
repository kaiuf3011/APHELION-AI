"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, AlertTriangle, Info, Bell, Check, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ComponentState } from "./mission-status-card";
import { fetchAlerts } from "@/lib/api";

interface AlertPanelProps {
  state?: ComponentState;
  onRetry?: () => void;
}

export function AlertPanel({ state = "normal", onRetry }: AlertPanelProps) {
  const query = useQuery({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
    refetchInterval: 5000,
  });

  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");

  const acknowledgeAlert = (id: string) => {
    setAcknowledgedIds(prev => new Set(prev).add(id));
  };

  const effectiveState: ComponentState =
    state !== "normal" ? state : query.isLoading ? "loading" : query.isError ? "error" : "normal";

  const alerts = query.data?.alerts ?? [];

  const activeAlerts = alerts.filter(a => {
    if (a.acknowledged || acknowledgedIds.has(a.id)) return false;
    if (filter === "all") return true;
    return a.severity === filter;
  });

  if (effectiveState === "loading") {
    return (
      <div className="space-y-3 w-full p-1 animate-pulse">
        <div className="flex gap-1 h-6 w-3/4 bg-muted/40 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-muted/15 border border-border/20 rounded p-3 h-16 flex flex-col justify-between">
            <div className="h-3.5 w-1/2 bg-muted/40 rounded" />
            <div className="h-2.5 w-full bg-muted/40 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (effectiveState === "empty" || activeAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 w-full h-full min-h-[220px] text-center bg-emerald-950/5 border border-emerald-900/10 rounded-lg">
        <div className="p-3 bg-emerald/10 text-emerald rounded-full mb-3 animate-pulse">
          <Check className="h-6 w-6" />
        </div>
        <h4 className="text-xs font-semibold text-emerald">Space Weather Nominal</h4>
        <p className="text-[10px] text-muted-foreground/80 mt-1 max-w-[180px]">
          No active alerts. All instruments reporting baseline nominal parameters.
        </p>
      </div>
    );
  }

  if (effectiveState === "error") {
    return (
      <div className="flex flex-col items-center justify-center p-6 w-full h-full min-h-[220px] text-center border border-red/20 rounded bg-red-950/5">
        <ShieldAlert className="h-8 w-8 text-red/60 mb-2 animate-bounce" />
        <h4 className="text-xs font-semibold text-red">Alert Pipeline Offline</h4>
        <p className="text-[10px] text-red/60 mt-1 font-mono">
          ERR_ALERT_PIPELINE: Unable to fetch alert configuration schemas.
        </p>
        {onRetry && (
          <button
            onClick={() => { onRetry(); query.refetch(); }}
            className="mt-3 text-[10px] flex items-center gap-1 px-2.5 py-1 rounded bg-red/10 border border-red/30 text-red hover:bg-red/20 transition-all font-mono"
          >
            <RefreshCw className="h-2.5 w-2.5" /> Re-register Pipeline
          </button>
        )}
      </div>
    );
  }

  const severityConfigs = {
    critical: { icon: AlertCircle, color: "text-red border-red/30 bg-red-950/10" },
    high: { icon: AlertTriangle, color: "text-amber border-amber/30 bg-amber-950/10" },
    medium: { icon: Info, color: "text-cyan border-cyan/30 bg-cyan-950/10" },
    low: { icon: Info, color: "text-muted-foreground border-border/40 bg-muted/10" }
  };

  return (
    <div className="flex flex-col h-full justify-between p-1 w-full gap-3">
      {/* Alert Severity Filter Buttons */}
      <div className="flex flex-wrap gap-1 font-mono text-[9px] border-b border-border/10 pb-2.5">
        {(["all", "critical", "high", "medium", "low"] as const).map((sev) => (
          <button
            key={sev}
            onClick={() => setFilter(sev)}
            className={`px-2 py-0.5 rounded border transition-all uppercase ${
              filter === sev
                ? sev === "critical"
                  ? "bg-red text-white border-red"
                  : sev === "high"
                  ? "bg-amber text-zinc-950 border-amber"
                  : sev === "medium"
                  ? "bg-cyan text-zinc-950 border-cyan"
                  : sev === "low"
                  ? "bg-muted-foreground text-zinc-950 border-muted-foreground"
                  : "bg-electric-blue text-white border-electric-blue"
                : "border-border/30 hover:bg-muted text-muted-foreground"
            }`}
          >
            {sev}
          </button>
        ))}
      </div>

      {/* Alerts Scroll List */}
      <ScrollArea className="flex-1 max-h-[220px] pr-2">
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {activeAlerts.map((alert) => {
              const config = severityConfigs[alert.severity];
              const IconComponent = config.icon;

              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`border rounded p-2.5 flex justify-between gap-3 text-xs ${config.color}`}
                >
                  <div className="flex gap-2">
                    <IconComponent className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-foreground">{alert.title}</span>
                        <span className="text-[9px] font-mono text-muted-foreground">{alert.timestamp}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">Source: {alert.source}</p>
                      <p className="text-[10px] text-foreground/80 mt-1 leading-normal">{alert.description}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="p-1 text-muted-foreground hover:text-foreground border border-border/20 rounded hover:bg-muted/40 shrink-0 self-start transition-colors"
                    title="Acknowledge alert"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
