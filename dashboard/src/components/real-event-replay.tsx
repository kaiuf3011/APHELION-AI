"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Satellite, Info, Loader2, AlertTriangle, Radio } from "lucide-react";
import {
  fetchReplayEvents,
  fetchReplayTelemetry,
  fetchReplayFingerprint,
  RealEventSummary,
} from "@/lib/api";

const ACTIVITY_COLORS: Record<string, string> = {
  Quiet: "text-emerald border-emerald/30 bg-emerald/10",
  Elevated: "text-cyan border-cyan/30 bg-cyan/10",
  Active: "text-amber border-amber/30 bg-amber/10",
  Extreme: "text-red border-red/30 bg-red/10",
};

function formatSampleTime(t: number): string {
  const d = new Date(t * 1000);
  return d.toISOString().substring(11, 19);
}

export function RealEventReplay() {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const eventsQuery = useQuery({
    queryKey: ["replay-events"],
    queryFn: fetchReplayEvents,
    refetchInterval: false,
  });

  useEffect(() => {
    if (!selectedEvent && eventsQuery.data?.events?.length) {
      setSelectedEvent(eventsQuery.data.events[0].event_id);
    }
  }, [eventsQuery.data, selectedEvent]);

  const telemetryQuery = useQuery({
    queryKey: ["replay-telemetry", selectedEvent],
    queryFn: () => fetchReplayTelemetry(selectedEvent as string),
    enabled: !!selectedEvent,
    refetchInterval: 2000,
  });

  const fingerprintQuery = useQuery({
    queryKey: ["replay-fingerprint", selectedEvent],
    queryFn: () => fetchReplayFingerprint(selectedEvent as string),
    enabled: !!selectedEvent,
    refetchInterval: 2000,
  });

  const chartData = (telemetryQuery.data?.points ?? []).map((p) => ({
    time: formatSampleTime(p.t),
    soft: p.soft,
    hard: p.hard,
  }));

  const fp = fingerprintQuery.data;
  const activityClass = fp ? ACTIVITY_COLORS[fp.activity_label] ?? ACTIVITY_COLORS.Quiet : ACTIVITY_COLORS.Quiet;

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm p-4 space-y-4">
      <CardHeader className="p-0 pb-3 border-b border-border/10">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-1.5">
            <Satellite className="h-4 w-4 text-electric-blue" /> Real Event Replay — Actual Aditya-L1 Downlink
          </span>
          <span className="text-[9px] font-mono text-cyan normal-case">Genuine SoLEXS/HEL1OS telemetry, not simulated</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 space-y-4">
        {/* Calibration disclosure — always visible, not buried */}
        <div className="flex items-start gap-2 p-2.5 rounded border border-amber/20 bg-amber-950/10 text-[10px] text-amber/90 leading-relaxed">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            These are raw, uncalibrated detector count rates from real archived Aditya-L1 files — not physical
            flux. No GOES class is shown here because that requires instrument calibration data not present in
            these product files. See <span className="font-mono">activity_percentile</span> for a relative
            severity measure within that day&apos;s own data instead.
          </span>
        </div>

        {/* Event picker */}
        {eventsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Scanning backend/data/raw for real archives...
          </div>
        ) : eventsQuery.isError ? (
          <div className="flex items-center gap-2 text-xs text-red/80 py-4 justify-center">
            <AlertTriangle className="h-4 w-4" /> Could not reach replay API.
          </div>
        ) : eventsQuery.data && eventsQuery.data.events.length === 0 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">
            No real archives found in backend/data/raw/.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
            {eventsQuery.data?.events.map((e: RealEventSummary) => (
              <button
                key={e.event_id}
                onClick={() => setSelectedEvent(e.event_id)}
                className={`px-2.5 py-1.5 rounded border transition-all flex items-center gap-1.5 ${
                  selectedEvent === e.event_id
                    ? "bg-electric-blue/20 border-electric-blue/50 text-foreground"
                    : "border-border/30 hover:bg-muted text-muted-foreground"
                }`}
              >
                {e.event_id}
                <span className="text-muted-foreground/70">peak {e.peak_counts.toFixed(0)}</span>
                {e.has_dual_channel ? (
                  <span className="text-emerald" title="SoLEXS + HEL1OS both cover this day">⬤⬤</span>
                ) : (
                  <span className="text-muted-foreground/50" title="SoLEXS only, no HEL1OS coverage">⬤</span>
                )}
              </button>
            ))}
          </div>
        )}

        {selectedEvent && (
          <>
            {/* Chart */}
            <div className="h-[220px] w-full">
              {telemetryQuery.isLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} minTickGap={40} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "rgba(9, 9, 11, 0.95)", borderColor: "hsl(var(--border))", borderRadius: "6px" }}
                      itemStyle={{ color: "hsl(var(--foreground))", fontSize: "11px" }}
                      labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: "10px" }}
                    />
                    <Line type="monotone" dataKey="soft" name="SoLEXS counts/s" stroke="var(--color-electric-blue)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="hard" name="HEL1OS counts/s" stroke="var(--color-amber)" strokeWidth={1.5} dot={false} connectNulls={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1">
                <Radio className="h-2.5 w-2.5 text-emerald animate-pulse" /> Scrubbing through {selectedEvent}
              </span>
              <span>{telemetryQuery.data?.progress_pct?.toFixed(1) ?? "--"}% through day ({telemetryQuery.data?.total_samples?.toLocaleString() ?? "--"} samples)</span>
            </div>

            {/* Fingerprint */}
            {fp && (
              <div className="space-y-3 pt-2 border-t border-border/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                    Real Behaviour Fingerprint
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${activityClass}`}>
                    {fp.activity_label.toUpperCase()} ({fp.activity_percentile.toFixed(0)}th pct)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[10px]">
                  <div className="bg-muted/15 p-2 rounded border border-border/15">
                    <span className="text-muted-foreground block text-[9px] uppercase">Peak Counts</span>
                    <span className="text-foreground font-bold">{fp.peak_counts.toFixed(0)} cts/s</span>
                  </div>
                  <div className="bg-muted/15 p-2 rounded border border-border/15">
                    <span className="text-muted-foreground block text-[9px] uppercase">SXR Rise Gradient</span>
                    <span className="text-foreground font-bold">{fp.sxr_rise_gradient_counts_per_s.toFixed(1)} cts/s²</span>
                  </div>
                  <div className="bg-muted/15 p-2 rounded border border-border/15">
                    <span className="text-muted-foreground block text-[9px] uppercase">Decay τ</span>
                    <span className="text-foreground font-bold">{fp.thermal_decay_tau_s > 0 ? `${fp.thermal_decay_tau_s.toFixed(0)}s` : "no clean fit"}</span>
                  </div>
                  <div className="bg-muted/15 p-2 rounded border border-border/15">
                    <span className="text-muted-foreground block text-[9px] uppercase">Duration (FWHM)</span>
                    <span className="text-foreground font-bold">{fp.event_duration_s.toFixed(0)}s</span>
                  </div>
                  <div className="bg-muted/15 p-2 rounded border border-border/15">
                    <span className="text-muted-foreground block text-[9px] uppercase">HXR→SXR Lag</span>
                    <span className="text-foreground font-bold">
                      {fp.hxr_sxr_lag_s !== null ? `${fp.hxr_sxr_lag_s.toFixed(0)}s` : "N/A"}
                    </span>
                  </div>
                  <div className="bg-muted/15 p-2 rounded border border-border/15">
                    <span className="text-muted-foreground block text-[9px] uppercase">Cross Correlation</span>
                    <span className="text-foreground font-bold">
                      {fp.cross_correlation !== null ? fp.cross_correlation.toFixed(2) : "N/A"}
                    </span>
                  </div>
                </div>

                {!fp.has_dual_channel && (
                  <p className="text-[9px] text-muted-foreground/70 font-mono">
                    No HEL1OS coverage in this window — lag/correlation/peak-ratio require both channels.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
