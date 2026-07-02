"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScientificMetricsGrid } from "@/components/scientific-metrics-grid";
import { PredictionTimeline } from "@/components/prediction-timeline";
import { Play, Sparkles, Cpu, CheckCircle2, AlertCircle, Brain } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { runForecast, ForecastRunResponse } from "@/lib/api";

const CLASS_STATUS: Record<string, string> = {
  A: "text-emerald", B: "text-emerald", C: "text-cyan", M: "text-amber", X: "text-red",
};

export default function ForecastCenter() {
  const [activeRegion, setActiveRegion] = useState("AR13654");
  const [simulationState, setSimulationState] = useState<"idle" | "running" | "completed" | "error">("idle");
  const [result, setResult] = useState<ForecastRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startSimulation = async () => {
    setSimulationState("running");
    setError(null);
    try {
      const data = await runForecast(activeRegion);
      setResult(data);
      setSimulationState("completed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Forecast request failed");
      setSimulationState("error");
    }
  };

  const fp = result?.fingerprint;
  const classColor = result ? CLASS_STATUS[result.forecast.predicted_class] ?? "text-foreground" : "text-foreground";

  return (
    <div className="flex-1 bg-zinc-950 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="border-b border-border/20 pb-4">
          <span className="text-[10px] font-mono text-electric-blue uppercase tracking-widest font-bold">Predictive modeling</span>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Solar Flare Forecast Center</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Analyze probabilities and trigger predictive models on target Active Regions.
          </p>
        </div>

        {/* Top Section: Grid and Timeline */}
        <div className="space-y-6">
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm p-4">
            <CardHeader className="p-0 pb-3 border-b border-border/10 mb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Active Model Validation Metrics</span>
                <span className="text-[9px] font-mono text-emerald">APHELION-XGB-v1 Active</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScientificMetricsGrid />
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur-sm p-4">
            <CardHeader className="p-0 pb-3 border-b border-border/10 mb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Nowcasting & Forecasting Timelines</span>
                <span className="text-[9px] font-mono text-cyan">Live</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <PredictionTimeline />
            </CardContent>
          </Card>
        </div>

        {/* Interactive Simulation Panel */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

          {/* Target input Form */}
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm md:col-span-5 p-4 space-y-4">
            <CardHeader className="p-0 pb-2 border-b border-border/10">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Cpu className="h-4 w-4" /> Trigger Region Forecast
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-2 space-y-4 text-xs">

              <div className="space-y-1.5 font-mono">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Target Active Region ID</label>
                <input
                  type="text"
                  value={activeRegion}
                  onChange={(e) => setActiveRegion(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-950 border border-border/80 rounded px-3 py-2 text-foreground font-bold focus:border-electric-blue outline-none transition-colors"
                  placeholder="e.g. AR13654"
                />
                <p className="text-[9px] text-muted-foreground/60 font-sans normal-case">
                  Same region ID always reproduces the same simulated telemetry (deterministic seed), so re-running is repeatable.
                </p>
              </div>

              <div className="space-y-1.5 font-mono">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Prediction Model</label>
                <select className="w-full bg-zinc-950 border border-border/80 rounded px-3 py-2 text-foreground font-medium outline-none">
                  <option>APHELION-XGB-v1 (Behaviour-Fingerprint Classifier)</option>
                </select>
              </div>

              {simulationState === "running" ? (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                    <span>Running Solar Behaviour Engine + XGBoost inference...</span>
                  </div>
                  <Progress value={70} className="h-1 bg-muted/40 animate-pulse" />
                </div>
              ) : (
                <button
                  onClick={startSimulation}
                  className="w-full h-10 inline-flex items-center justify-center rounded bg-foreground px-4 text-xs font-mono uppercase tracking-wider font-semibold text-background hover:bg-foreground/90 transition-colors gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5 fill-background" /> Run Model Simulation
                </button>
              )}
            </CardContent>
          </Card>

          {/* Results Output */}
          <div className="md:col-span-7 h-full">
            {simulationState === "error" ? (
              <Card className="border-red/30 bg-red-950/10 backdrop-blur-sm h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 rounded-lg">
                <AlertCircle className="h-8 w-8 text-red/60 mb-2" />
                <h3 className="text-sm font-semibold text-red">Forecast Request Failed</h3>
                <p className="text-xs text-red/70 mt-1 max-w-[320px] font-mono">{error}</p>
              </Card>
            ) : simulationState === "completed" && result && fp ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">
                {/* Forecast summary */}
                <Card className="border-border/40 bg-card/50 backdrop-blur-sm flex flex-col justify-between p-4">
                  <CardHeader className="p-0 pb-2 border-b border-border/10 mb-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Brain className="h-3.5 w-3.5 text-electric-blue" /> Forecast: {result.region_id}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-3 text-xs">
                    <div className="bg-muted/15 p-2.5 rounded border border-border/10">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-bold text-lg ${classColor}`}>{result.forecast.predicted_class}-class</span>
                        <span className="font-mono font-bold text-amber bg-amber/10 px-1.5 py-0.5 rounded text-[10px]">
                          {(result.forecast.confidence * 100).toFixed(1)}% CONFIDENCE
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Simulated fingerprint classified as GOES {fp.goes_class as string}. Estimated lead time: {result.forecast.lead_time_minutes} min.
                        P(M-class or above): {(result.forecast.probability_m_or_above * 100).toFixed(1)}%.
                      </p>
                    </div>

                    <div className="space-y-1.5 font-mono">
                      <span className="uppercase tracking-widest text-[9px] text-muted-foreground font-semibold">Signal Attribution</span>
                      {result.forecast.attribution.slice(0, 3).map((a) => (
                        <div key={a.feature}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-muted-foreground">{a.label}</span>
                            <span className="text-foreground">{a.contribution_pct.toFixed(0)}%</span>
                          </div>
                          <Progress value={a.contribution_pct} className="h-1 bg-muted/40" />
                        </div>
                      ))}
                    </div>

                    {result.closest_historical_match && (
                      <div className="pt-2 border-t border-border/10 font-mono text-[10px] text-muted-foreground flex justify-between">
                        <span>Closest historical analog:</span>
                        <span className="text-foreground">
                          {result.closest_historical_match.id} ({result.closest_historical_match.similarity_pct}%)
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Fingerprint */}
                <Card className="border-border/40 bg-card/50 backdrop-blur-sm flex flex-col justify-between p-4">
                  <CardHeader className="p-0 pb-2 border-b border-border/10 mb-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Simulated Fingerprint
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between border-b border-border/10 py-1">
                      <span className="text-muted-foreground">Rise Velocity</span>
                      <span className="text-foreground">{(fp.rise_velocity_kms as number).toFixed(1)} km/s</span>
                    </div>
                    <div className="flex justify-between border-b border-border/10 py-1">
                      <span className="text-muted-foreground">Peak Ratio</span>
                      <span className="text-foreground">{(fp.peak_ratio as number).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/10 py-1">
                      <span className="text-muted-foreground">Cross Correlation</span>
                      <span className="text-foreground">{(fp.cross_correlation as number).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/10 py-1">
                      <span className="text-muted-foreground">HXR→SXR Lag</span>
                      <span className="text-foreground">{(fp.hxr_sxr_lag_s as number).toFixed(0)}s</span>
                    </div>
                    <div className="flex justify-between border-b border-border/10 py-1">
                      <span className="text-muted-foreground">Thermal Decay τ</span>
                      <span className="text-foreground">{(fp.thermal_decay_tau_s as number).toFixed(0)}s</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Event Duration</span>
                      <span className="text-foreground">{(fp.event_duration_s as number).toFixed(0)}s</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-dashed border-border/40 bg-zinc-950/10 backdrop-blur-sm h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 rounded-lg">
                <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <h3 className="text-sm font-semibold text-muted-foreground">Forecast Output Pending</h3>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-[280px]">
                  Fill in a Target Region ID and click &apos;Run Model Simulation&apos; to inspect predictive physics and signal attribution coefficients.
                </p>
              </Card>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
