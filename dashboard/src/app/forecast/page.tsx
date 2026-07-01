"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScientificMetricsGrid } from "@/components/scientific-metrics-grid";
import { PredictionTimeline } from "@/components/prediction-timeline";
import { ExplainableAICard } from "@/components/explainable-ai-card";
import { BehaviourFingerprint } from "@/components/behaviour-fingerprint";
import { Play, Sparkles, RefreshCw, Cpu, Layers, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ForecastCenter() {
  const [activeRegion, setActiveRegion] = useState("AR13654");
  const [simulationState, setSimulationState] = useState<"idle" | "running" | "completed">("idle");
  const [simProgress, setSimProgress] = useState(0);

  const startSimulation = () => {
    setSimulationState("running");
    setSimProgress(0);
    
    const interval = setInterval(() => {
      setSimProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setSimulationState("completed");
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

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
                <span className="text-[9px] font-mono text-emerald">PINN-v4.2 Active</span>
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
                <span className="text-[9px] font-mono text-cyan">Updated 2m ago</span>
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
              </div>

              <div className="space-y-1.5 font-mono">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Prediction Model</label>
                <select className="w-full bg-zinc-950 border border-border/80 rounded px-3 py-2 text-foreground font-medium outline-none">
                  <option>PINN-v4.2 (Physics-Informed Neural Network)</option>
                  <option>SolarNet-v2.1 (CNN Magnetogram Classifier)</option>
                  <option>Neupert-LSTM-v1.0 (Lag Predictor)</option>
                </select>
              </div>

              {simulationState === "running" ? (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                    <span>Compiling magnetogram shear arrays...</span>
                    <span>{simProgress}%</span>
                  </div>
                  <Progress value={simProgress} className="h-1 bg-muted/40" />
                </div>
              ) : (
                <button
                  onClick={startSimulation}
                  disabled={false}
                  className="w-full h-10 inline-flex items-center justify-center rounded bg-foreground px-4 text-xs font-mono uppercase tracking-wider font-semibold text-background hover:bg-foreground/90 transition-colors gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5 fill-background" /> Run Model Simulation
                </button>
              )}
            </CardContent>
          </Card>

          {/* Results Output */}
          <div className="md:col-span-7 h-full">
            {simulationState === "completed" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">
                <div className="h-full">
                  <ExplainableAICard />
                </div>
                <Card className="border-border/40 bg-card/50 backdrop-blur-sm flex flex-col justify-between p-4">
                  <CardHeader className="p-0 pb-2 border-b border-border/10 mb-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Simulated Fingerprint
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <BehaviourFingerprint />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-dashed border-border/40 bg-zinc-950/10 backdrop-blur-sm h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 rounded-lg">
                <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <h3 className="text-sm font-semibold text-muted-foreground">Forecast Output Pending</h3>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-[280px]">
                  Fill in a Target Region ID and click 'Run Model Simulation' to inspect predictive physics and signal attribution coefficients.
                </p>
              </Card>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
