"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend, Brush, ReferenceLine, ReferenceArea } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart as ChartIcon, Zap, Play, Pause, RefreshCw, Eye } from "lucide-react";
import { ComponentState } from "./mission-status-card";
import { fetchTelemetryLive, fetchHistorySimilar } from "@/lib/api";

interface DualXrayChartProps {
  state?: ComponentState;
  onRetry?: () => void;
}

interface ChartPoint {
  time: string;
  soft: number;
  hard: number;
}

// Rescale a 0-1 normalized similarity curve into the chart's log-scale W/m^2 domain
function curveToFlux(curve: number[], peakExp = -4): ChartPoint[] {
  return curve.map((v, i) => {
    const clamped = Math.max(0, Math.min(1, v));
    // Map normalized [0,1] onto a log range from 1e-8 up to 10^peakExp
    const exp = -8 + clamped * (peakExp - -8);
    return {
      time: `${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}`,
      soft: Math.pow(10, exp),
      hard: Math.pow(10, exp - 1),
    };
  });
}

export function DualXrayChart({ state = "normal", onRetry }: DualXrayChartProps) {
  const [chartMode, setChartMode] = useState<"live" | "historical">("historical");
  const [isLivePlaying, setIsLivePlaying] = useState(true);

  const liveQuery = useQuery({
    queryKey: ["telemetry-live"],
    queryFn: () => fetchTelemetryLive(60),
    refetchInterval: chartMode === "live" && isLivePlaying ? 3000 : false,
  });

  const historyQuery = useQuery({
    queryKey: ["history-similar"],
    queryFn: fetchHistorySimilar,
    refetchInterval: chartMode === "historical" ? 5000 : false,
  });

  const activeQuery = chartMode === "live" ? liveQuery : historyQuery;

  const effectiveState: ComponentState =
    state !== "normal" ? state : activeQuery.isLoading ? "loading" : activeQuery.isError ? "error" : "normal";

  if (effectiveState === "loading") {
    return (
      <div className="w-full h-full flex flex-col justify-between p-4 min-h-[300px]">
        <div className="flex justify-between items-center mb-4">
          <div className="h-4 w-40 bg-muted/40 rounded animate-pulse" />
          <div className="h-6 w-32 bg-muted/40 rounded animate-pulse" />
        </div>
        <div className="flex-1 bg-muted/20 border border-dashed border-border/40 rounded flex items-center justify-center animate-pulse">
          <ChartIcon className="h-10 w-10 text-muted-foreground/30" />
        </div>
      </div>
    );
  }

  if (effectiveState === "empty") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 min-h-[300px] text-center border border-dashed border-border/40 rounded-lg">
        <ChartIcon className="h-10 w-10 text-muted-foreground/30 mb-2 animate-bounce" />
        <h4 className="text-sm font-semibold text-muted-foreground">No Telemetry Stream</h4>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-[240px]">
          Launch real-time sensors or select a historical solar event.
        </p>
      </div>
    );
  }

  if (effectiveState === "error") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 min-h-[300px] text-center border border-red/20 rounded-lg bg-red-950/5">
        <Zap className="h-10 w-10 text-red/60 mb-2 animate-pulse" />
        <h4 className="text-sm font-semibold text-red">X-Ray Telemetry Error</h4>
        <p className="text-xs text-red/60 mt-1 max-w-[280px] font-mono">
          ERR_CHART_DECOMPRESSION_FAILED: Packet frame check error on HEL1OS channel B.
        </p>
        {onRetry && (
          <button
            onClick={() => { onRetry(); activeQuery.refetch(); }}
            className="mt-4 text-xs flex items-center gap-1.5 px-3 py-1.5 rounded bg-red/10 border border-red/30 text-red hover:bg-red/20 transition-all"
          >
            <RefreshCw className="h-3 w-3" /> Retry Sync
          </button>
        )}
      </div>
    );
  }

  const chartData: ChartPoint[] =
    chartMode === "live"
      ? (liveQuery.data?.points ?? []).map((p) => ({ time: p.time, soft: p.soft, hard: p.hard }))
      : historyQuery.data
      ? curveToFlux(historyQuery.data.match.curve)
      : [];

  return (
    <div className="w-full h-full flex flex-col justify-between min-h-[340px] p-1">
      {/* Chart Headers & Mode Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-border/10 pb-3">
        <div className="flex items-center gap-2">
          <ChartIcon className="h-4 w-4 text-electric-blue" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            X-Ray Flux Telemetry ({chartMode === "live" ? "Real-time" : "Historical Archive"})
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-muted/30 border border-border/40 rounded p-0.5 flex gap-1 font-mono">
            <button
              onClick={() => setChartMode("historical")}
              className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 text-[10px] ${
                chartMode === "historical"
                  ? "bg-electric-blue text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-2.5 w-2.5" /> Closest Match
            </button>
            <button
              onClick={() => setChartMode("live")}
              className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 text-[10px] ${
                chartMode === "live"
                  ? "bg-electric-blue text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${chartMode === "live" ? "bg-white" : "bg-red"}`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${chartMode === "live" ? "bg-white" : "bg-red"}`}></span>
              </span>
              LIVE SIM
            </button>
          </div>

          {chartMode === "live" && (
            <button
              onClick={() => setIsLivePlaying(!isLivePlaying)}
              className="p-1 rounded bg-muted/40 hover:bg-muted/80 text-foreground transition-all"
            >
              {isLivePlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Chart Container */}
      <div className="flex-1 w-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 10, left: 15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={11} 
              tickLine={false}
              axisLine={false}
              minTickGap={20}
              fontFamily="var(--font-geist-mono)"
            />
            <YAxis 
              scale="log" 
              domain={['1e-9', '1e-3']} 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `1e${Math.round(Math.log10(val))}`}
              fontFamily="var(--font-geist-mono)"
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.95)', borderColor: 'hsl(var(--border))', borderRadius: '6px' }}
              itemStyle={{ color: 'hsl(var(--foreground))', fontFamily: 'var(--font-geist-mono)', fontSize: '11px' }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-geist-mono)', fontSize: '10px', marginBottom: '4px' }}
              cursor={{ stroke: 'rgba(0, 112, 243, 0.4)', strokeWidth: 1 }}
            />
            <Legend verticalAlign="top" height={30} iconType="circle" fontSize={11} wrapperStyle={{ paddingBottom: '10px' }} />

            {/* Overlays / Thresholds for Solar Flare classification */}
            {/* GOES scale markers: B-class: 1e-7, C-class: 1e-6, M-class: 1e-5, X-class: 1e-4 */}
            <ReferenceLine 
              y={1e-5} 
              stroke="var(--color-amber)" 
              strokeDasharray="4 4" 
              opacity={0.6}
              label={{ value: "M-Class Threshold (1e-5)", fill: "var(--color-amber)", fontSize: 9, position: "top", fontFamily: "var(--font-geist-mono)" }} 
            />
            <ReferenceLine 
              y={1e-4} 
              stroke="var(--color-red)" 
              strokeDasharray="4 4" 
              opacity={0.6}
              label={{ value: "X-Class Threshold (1e-4)", fill: "var(--color-red)", fontSize: 9, position: "top", fontFamily: "var(--font-geist-mono)" }} 
            />

            {/* Annotation for Neupert Effect Lag during historical event */}
            {chartMode === "historical" && (
              <>
                <ReferenceLine 
                  x="00:30" 
                  stroke="var(--color-amber)" 
                  strokeDasharray="2 2"
                  label={{ value: "HXR Peak (HEL1OS)", fill: "var(--color-amber)", fontSize: 8, position: "insideBottomLeft", fontFamily: "var(--font-geist-mono)" }}
                />
                <ReferenceLine 
                  x="00:35" 
                  stroke="var(--color-electric-blue)" 
                  strokeDasharray="2 2"
                  label={{ value: "SXR Peak (SoLEXS)", fill: "var(--color-electric-blue)", fontSize: 8, position: "insideBottomLeft", fontFamily: "var(--font-geist-mono)" }}
                />
                <ReferenceArea 
                  x1="00:30" 
                  x2="00:35" 
                  fill="var(--color-electric-blue)" 
                  fillOpacity={0.05} 
                  label={{ value: "Neupert Lag: 5m", fill: "var(--color-muted-foreground)", fontSize: 8, position: "center" }}
                />
              </>
            )}

            <Line 
              type="monotone" 
              dataKey="soft" 
              name="Soft X-Ray (1-8 Å)" 
              stroke="var(--color-electric-blue)" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="hard" 
              name="Hard X-Ray (0.5-4 Å)" 
              stroke="var(--color-amber)" 
              strokeWidth={1.5} 
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Brush 
              dataKey="time" 
              height={20} 
              stroke="var(--color-electric-blue)" 
              fill="rgba(9, 9, 11, 0.9)"
              tickFormatter={() => ""}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
