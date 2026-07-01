"use client";

import { useEffect, useState, useRef } from "react";
import { Radio, WifiOff, Terminal, Play, Pause, ShieldAlert, Sparkles, RefreshCw, PlusCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ComponentState } from "./mission-status-card";

interface TelemetryPacket {
  id: string;
  time: string;
  payload: "SoLEXS" | "HEL1OS" | "ASPEX" | "PAPA" | "SYS";
  parameter: string;
  value: string;
  status: "nominal" | "warning" | "critical";
  flash?: boolean;
}

const mockParams = [
  { payload: "SoLEXS", parameter: "SXR_Flux_1_8A", getValue: () => (Math.random() * 8.5e-6).toExponential(3) + " W/m²", getStatus: (val: string) => parseFloat(val) > 7.5e-6 ? "critical" : parseFloat(val) > 4.5e-6 ? "warning" : "nominal" },
  { payload: "HEL1OS", parameter: "HXR_Counts_10_25", getValue: () => Math.floor(Math.random() * 4500) + " cps", getStatus: (val: string) => parseInt(val) > 3500 ? "critical" : parseInt(val) > 2000 ? "warning" : "nominal" },
  { payload: "SoLEXS", parameter: "Det_Temp_A", getValue: () => (-20 + Math.random() * 4).toFixed(2) + " °C", getStatus: () => "nominal" },
  { payload: "HEL1OS", parameter: "HV_Supply_Status", getValue: () => (1800 + Math.random() * 5).toFixed(1) + " V", getStatus: () => "nominal" },
  { payload: "ASPEX", parameter: "Proton_Density", getValue: () => (Math.random() * 12).toFixed(1) + " p/cm³", getStatus: () => "nominal" },
  { payload: "PAPA", parameter: "Electron_Temp", getValue: () => (100000 + Math.random() * 5000).toFixed(0) + " K", getStatus: () => "nominal" },
  { payload: "SYS", parameter: "Ground_Link_Margin", getValue: () => (95 + Math.random() * 5).toFixed(1) + " dBHz", getStatus: (val: string) => parseFloat(val) < 96.0 ? "warning" : "nominal" }
] as const;

export function LiveTelemetryPanel({ state = "normal", onRetry }: { state?: ComponentState; onRetry?: () => void }) {
  const [packets, setPackets] = useState<TelemetryPacket[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const packetIdRef = useRef(0);

  // Generate initial packets
  useEffect(() => {
    if (state !== "normal") return;

    const initialPackets = Array.from({ length: 15 }).map((_, i) => {
      const param = mockParams[i % mockParams.length];
      const val = param.getValue();
      const st = param.getStatus(val) as "nominal" | "warning" | "critical";
      const timeStr = new Date(Date.now() - (15 - i) * 2000).toISOString().substring(11, 19);

      return {
        id: `pkt-${packetIdRef.current++}`,
        time: timeStr,
        payload: param.payload,
        parameter: param.parameter,
        value: val,
        status: st
      };
    });
    setPackets(initialPackets);
  }, [state]);

  // Handle packet streaming
  useEffect(() => {
    if (state !== "normal" || !isPlaying) return;

    const interval = setInterval(() => {
      const param = mockParams[Math.floor(Math.random() * mockParams.length)];
      const val = param.getValue();
      const st = param.getStatus(val) as "nominal" | "warning" | "critical";
      const timeStr = new Date().toISOString().substring(11, 19);

      const newPacket: TelemetryPacket = {
        id: `pkt-${packetIdRef.current++}`,
        time: timeStr,
        payload: param.payload,
        parameter: param.parameter,
        value: val,
        status: st,
        flash: true
      };

      setPackets(prev => {
        // Keep a max list of 100 packets
        const updated = prev.length >= 100 ? [...prev.slice(1), newPacket] : [...prev, newPacket];
        
        // Remove flash tag after 1s
        setTimeout(() => {
          setPackets(current => current.map(p => p.id === newPacket.id ? { ...p, flash: false } : p));
        }, 1000);

        return updated;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [state, isPlaying]);

  // Handle Autoscroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [packets, autoScroll]);

  // Injects custom anomaly packet
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
    setPackets(prev => [...prev, newAnomaly]);
  };

  if (state === "loading") {
    return (
      <div className="w-full min-h-[220px] flex flex-col justify-between p-4 animate-pulse">
        <div className="h-6 w-1/3 bg-muted/40 rounded mb-4" />
        <div className="flex-1 bg-muted/20 border border-dashed border-border/40 rounded flex items-center justify-center">
          <Terminal className="h-8 w-8 text-muted-foreground/30" />
        </div>
      </div>
    );
  }

  if (state === "empty") {
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

  if (state === "error") {
    return (
      <div className="w-full min-h-[220px] flex flex-col items-center justify-center p-8 text-center border border-red/20 rounded-lg bg-red-950/5">
        <ShieldAlert className="h-10 w-10 text-red/60 mb-2 animate-bounce" />
        <h4 className="text-sm font-semibold text-red">Downlink Demux Failure</h4>
        <p className="text-xs text-red/60 mt-1 max-w-[320px] font-mono">
          ERR_DEMUX_FRAME_SYNC: Telemetry frames corrupted. Subcarrier phase offset too large.
        </p>
        {onRetry && (
          <button 
            onClick={onRetry}
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
