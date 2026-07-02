"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Radio, Wifi, ShieldAlert, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchMissionStatus } from "@/lib/api";

export type ComponentState = "normal" | "loading" | "empty" | "error";

interface MissionStatusCardProps {
  state?: ComponentState;
  onRetry?: () => void;
}

export function MissionStatusCard({ state = "normal", onRetry }: MissionStatusCardProps) {
  const [time, setTime] = useState("");

  const query = useQuery({
    queryKey: ["mission-status"],
    queryFn: fetchMissionStatus,
    refetchInterval: 4000,
  });

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const effectiveState: ComponentState =
    state !== "normal" ? state : query.isLoading ? "loading" : query.isError ? "error" : "normal";

  if (effectiveState === "loading") {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm h-full flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="h-4 w-32 bg-muted/40 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col justify-center">
          <div className="h-8 w-24 bg-muted/40 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-muted/40 rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-muted/40 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (effectiveState === "empty") {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm h-full flex flex-col justify-center items-center p-6 text-center">
        <Radio className="h-8 w-8 text-muted-foreground/60 mb-2 animate-bounce" />
        <h3 className="text-sm font-semibold text-muted-foreground">No Telemetry Link</h3>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px]">
          Waiting for Aditya-L1 ground station visibility window.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 text-xs flex items-center gap-1.5 px-3 py-1.5 rounded border border-border/80 hover:bg-muted text-foreground transition-all"
          >
            <RefreshCw className="h-3 w-3" /> Reconnect Link
          </button>
        )}
      </Card>
    );
  }

  if (effectiveState === "error") {
    return (
      <Card className="border-red/40 bg-red-950/10 backdrop-blur-sm h-full flex flex-col justify-center p-6 border">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-red">Link Sync Failure</h3>
            <p className="text-xs text-red/80 font-mono">
              ERR_TELEMETRY_SYNC_LOSS: Backend API unreachable at {process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"}.
            </p>
            {onRetry && (
              <button
                onClick={() => { onRetry(); query.refetch(); }}
                className="mt-3 text-xs flex items-center gap-1.5 px-2.5 py-1 rounded bg-red/20 hover:bg-red/35 text-red transition-all border border-red/30"
              >
                <RefreshCw className="h-3 w-3" /> Re-align Antenna
              </button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  const data = query.data;
  const isNominal = data?.status === "NOMINAL";

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm h-full flex flex-col justify-between hover:border-border/80 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5" />
            Aditya-L1 Telemetry
          </CardTitle>
          <div className="flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isNominal ? "bg-emerald" : "bg-amber"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isNominal ? "bg-emerald" : "bg-amber"}`}></span>
            </span>
            <span className={`text-[10px] font-mono uppercase font-medium ${isNominal ? "text-emerald" : "text-amber"}`}>L1_OK</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-2xl font-bold tracking-tight">{data?.status ?? "NOMINAL"}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 font-mono">
            <Wifi className="h-3 w-3 text-emerald" />
            <span>ISRO IDSN-32 locked</span>
            <span className="text-border">|</span>
            <span className="text-emerald">{data?.link_margin_dbhz.toFixed(1) ?? "--"} dBHz</span>
          </div>
        </div>

        {/* Payload Status Grid */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20">
          {Object.entries(data?.payloads ?? {}).map(([name, payload]) => (
            <div key={name} className="bg-muted/20 p-2 rounded border border-border/10 flex flex-col justify-between">
              <span className="text-[10px] text-muted-foreground font-mono">{name}</span>
              <span className="text-xs font-medium text-foreground mt-1 flex items-center justify-between">
                <span>{payload.state}</span>
                <span className={`text-[10px] font-mono ${payload.state === "Active" ? "text-emerald" : "text-cyan"}`}>
                  {payload.duty_cycle_pct}%
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 justify-between pt-1">
          <span>Downlink Packets: <span className="text-foreground">{(data?.downlink_packets ?? 0).toLocaleString()}</span></span>
          <span>{time}</span>
        </div>
      </CardContent>
    </Card>
  );
}
