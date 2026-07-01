"use client";

import { useEffect, useState } from "react";
import { Activity, Radio, Wifi, ShieldAlert, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type ComponentState = "normal" | "loading" | "empty" | "error";

interface MissionStatusCardProps {
  state?: ComponentState;
  onRetry?: () => void;
}

export function MissionStatusCard({ state = "normal", onRetry }: MissionStatusCardProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (state === "loading") {
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

  if (state === "empty") {
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

  if (state === "error") {
    return (
      <Card className="border-red/40 bg-red-950/10 backdrop-blur-sm h-full flex flex-col justify-center p-6 border">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-red">Link Sync Failure</h3>
            <p className="text-xs text-red/80 font-mono">
              ERR_TELEMETRY_SYNC_LOSS: Ground antenna alignment offset. DSN code: 0x4B3A
            </p>
            {onRetry && (
              <button 
                onClick={onRetry}
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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald"></span>
            </span>
            <span className="text-[10px] font-mono text-emerald uppercase font-medium">L1_OK</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-2xl font-bold tracking-tight">NOMINAL</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 font-mono">
            <Wifi className="h-3 w-3 text-emerald" />
            <span>ISRO IDSN-32 locked</span>
            <span className="text-border">|</span>
            <span className="text-emerald">98.2 dBHz</span>
          </div>
        </div>

        {/* Payload Status Grid */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20">
          <div className="bg-muted/20 p-2 rounded border border-border/10 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground font-mono">SoLEXS</span>
            <span className="text-xs font-medium text-foreground mt-1 flex items-center justify-between">
              <span>Active</span>
              <span className="text-[10px] text-emerald font-mono">100%</span>
            </span>
          </div>
          <div className="bg-muted/20 p-2 rounded border border-border/10 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground font-mono">HEL1OS</span>
            <span className="text-xs font-medium text-foreground mt-1 flex items-center justify-between">
              <span>Active</span>
              <span className="text-[10px] text-emerald font-mono">98%</span>
            </span>
          </div>
          <div className="bg-muted/20 p-2 rounded border border-border/10 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground font-mono">ASPEX</span>
            <span className="text-xs font-medium text-foreground mt-1 flex items-center justify-between">
              <span>Standby</span>
              <span className="text-[10px] text-cyan font-mono">92%</span>
            </span>
          </div>
          <div className="bg-muted/20 p-2 rounded border border-border/10 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground font-mono">PAPA</span>
            <span className="text-xs font-medium text-foreground mt-1 flex items-center justify-between">
              <span>Active</span>
              <span className="text-[10px] text-emerald font-mono">100%</span>
            </span>
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 justify-between pt-1">
          <span>Downlink Packets: <span className="text-foreground">2,845,920</span></span>
          <span>{time}</span>
        </div>
      </CardContent>
    </Card>
  );
}
