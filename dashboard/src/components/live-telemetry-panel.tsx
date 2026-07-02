"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radio, WifiOff, Terminal, Play, Pause, ShieldAlert, Sparkles, RefreshCw, PlusCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ComponentState } from "./mission-status-card";
import { fetchTelemetryPackets, TelemetryPacket as ApiTelemetryPacket } from "@/lib/api";

interface TelemetryPacket extends ApiTelemetryPacket {
  flash?: boolean;
}

export function LiveTelemetryPanel({ state = "normal", onRetry }: { state?: ComponentState; onRetry?: () => void }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [injectedPackets, setInjectedPackets] = useState<TelemetryPacket[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const packetIdRef = useRef(0);
  const prevIdsRef = useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ["telemetry-packets"],
    queryFn: () => fetchTelemetryPackets(30),
    refetchInterval: isPlaying ? 2500 : false,
  });

  const [packets, setPackets] = useState<TelemetryPacket[]>([]);

  // Merge fetched packets, flashing any newly-seen ids, and append injected packets
  useEffect(() => {
    const fetched = query.data?.packets ?? [];
    const prevIds = prevIdsRef.current;
    const merged: TelemetryPacket[] = fetched.map((p) => ({ ...p, flash: !prevIds.has(p.id) }));
    prevIdsRef.current = new Set(fetched.map((p) => p.id));
    setPackets([...merged, ...injectedPackets]);

    const newIds = merged.filter((p) => p.flash).map((p) => p.id);
    if (newIds.length > 0) {
      const timeout = setTimeout(() => {
        setPackets((current) => current.map((p) => (newIds.includes(p.id) ? { ...p, flash: false } : p)));
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [query.data, injectedPackets]);

  const effectiveState: ComponentState =
    state !== "normal" ? state : query.isLoading ? "loading" : query.isError ? "error" : "normal";

  // Handle Autoscroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [packets, autoScroll]);

  // Injects custom anomaly packet (client-only demo action)
  const injectAnomaly = () => {
    const timeStr = new Date().toISOString().substring(11, 19);
    const newAnomaly: TelemetryPacket = {
      id: `pkt-anomaly-${packetIdRef.current++}`,
      time: timeStr,
      payload: "SoLEXS",
      parameter: "SXR_Flux_Anom_Trigger",
      value: "9.24e-4 W/m² [CRIT]",
      status: "critical",
      flash: true
    };
    setInjectedPackets(prev => [...prev, newAnomaly]);
    setPackets(prev => [...prev, newAnomaly]);
  };

  if (effectiveState === "loading") {
    return (
      <div className="w-full min-h-[220px] flex flex-col justify-between p-4 animate-pulse">
        <div className="h-6 w-1/3 bg-muted/40 rounded mb-4" />
        <div className="flex-1 bg-muted/20 border border-dashed border-border/40 rounded flex items-center justify-center">
          <Terminal className="h-8 w-8 text-muted-foreground/30" />
        </div>
      </div>
    );
  }

  if (effectiveState === "empty") {
    return (
      <div className="w-full min-h-[220px] flex flex-col items-center justify-center p-8 text-center border border-dashed border-border/40 rounded-lg">
        <WifiOff className="h-10 w-10 text-muted-foreground/30 mb-2 animate-pulse" />
        <h4 className="text-sm font-semibold text-muted-foreground">Telemetry Standby</h4>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-[240px]">
          No telemetry stream incoming. Verify Spacecraft receiver synchronization.
        </p>
      </div>
    );
  }

  if (effectiveState === "error") {
    return (
      <div className="w-full min-h-[220px] flex flex-col items-center justify-center p-8 text-center border border-red/20 rounded-lg bg-red-950/5">
        <ShieldAlert className="h-10 w-10 text-red/60 mb-2 animate-bounce" />
        <h4 className="text-sm font-semibold text-red">Downlink Demux Failure</h4>
        <p className="text-xs text-red/60 mt-1 max-w-[320px] font-mono">
          ERR_DEMUX_FRAME_SYNC: Telemetry frames corrupted. Subcarrier phase offset too large.
        </p>
        {onRetry && (
          <button
            onClick={() => { onRetry(); query.refetch(); }}
            className="mt-4 text-xs flex items-center gap-1.5 px-3 py-1.5 rounded bg-red/10 border border-red/30 text-red hover:bg-red/20 transition-all font-mono"
          >
            <RefreshCw className="h-3 w-3" /> Demux Force Reset
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[280px] justify-between p-1 w-full gap-3">
      {/* Control Ribbon */}
      <div className="flex items-center justify-between border-b border-border/10 pb-2 flex-wrap gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-emerald" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Live Telemetry Console
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/40 hover:bg-muted text-[9px] uppercase transition-colors"
          >
            {isPlaying ? (
              <>
                <Pause className="h-2.5 w-2.5" /> Pause Link
              </>
            ) : (
              <>
                <Play className="h-2.5 w-2.5" /> Resume Link
              </>
            )}
          </button>
          
          <button
            onClick={injectAnomaly}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-red/30 bg-red-950/10 hover:bg-red/20 text-red text-[9px] uppercase transition-colors"
          >
            <PlusCircle className="h-2.5 w-2.5" /> Inject CRIT
          </button>
          
          <label className="flex items-center gap-1 text-[9px] text-muted-foreground select-none cursor-pointer uppercase">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="accent-emerald"
            />
            AutoScroll
          </label>
        </div>
      </div>

      {/* Telemetry Console Logger */}
      <div ref={scrollRef} className="flex-1 bg-zinc-950/90 border border-border/50 rounded-lg p-2.5 font-mono text-[10px] leading-relaxed relative">
        <ScrollArea className="h-48 pr-2">
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-1 text-[9px] uppercase text-muted-foreground border-b border-border/20 pb-1 mb-1 font-bold">
              <span className="col-span-2">Time</span>
              <span className="col-span-2">Payload</span>
              <span className="col-span-5">Sensor Parameter</span>
              <span className="col-span-3 text-right">Value</span>
            </div>

            {packets.map((pkt) => {
              const statusColors = {
                nominal: "text-emerald",
                warning: "text-amber",
                critical: "text-red font-bold"
              };

              const lineFlashClass = pkt.flash
                ? pkt.status === "critical"
                  ? "bg-red/25 border-l-2 border-red pl-1"
                  : pkt.status === "warning"
                  ? "bg-amber/15 border-l-2 border-amber pl-1"
                  : "bg-emerald/10 border-l-2 border-emerald pl-1"
                : "border-l border-transparent pl-1";

              return (
                <div
                  key={pkt.id}
                  className={`grid grid-cols-12 gap-1 py-0.5 transition-all rounded hover:bg-muted/30 ${lineFlashClass}`}
                >
                  <span className="col-span-2 text-muted-foreground">{pkt.time}</span>
                  <span className="col-span-2 text-foreground font-semibold">{pkt.payload}</span>
                  <span className="col-span-5 text-muted-foreground select-all">{pkt.parameter}</span>
                  <span className={`col-span-3 text-right font-bold select-all ${statusColors[pkt.status]}`}>
                    {pkt.value}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
