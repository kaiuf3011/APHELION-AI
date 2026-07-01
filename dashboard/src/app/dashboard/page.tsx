"use client";

import { useState } from "react";
import { MissionStatusCard, ComponentState } from "@/components/mission-status-card";
import { SolarHealthIndex } from "@/components/solar-health-index";
import { AlertPanel } from "@/components/alert-panel";
import { DualXrayChart } from "@/components/dual-xray-chart";
import { PredictionTimeline } from "@/components/prediction-timeline";
import { LiveTelemetryPanel } from "@/components/live-telemetry-panel";
import { ExplainableAICard } from "@/components/explainable-ai-card";
import { BehaviourFingerprint } from "@/components/behaviour-fingerprint";
import { HistoricalSimilarityCard } from "@/components/historical-similarity-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Sliders, CheckCircle2, ShieldAlert, Cpu } from "lucide-react";

export default function Dashboard() {
  const [dashboardState, setDashboardState] = useState<ComponentState>("normal");

  const getDiagnosticsConfig = () => {
    switch (dashboardState) {
      case "loading":
        return {
          banner: "DIAGNOSTIC STATUS: PIPELINE SIMULATION IN PROGRESS (LOADING STATES ENABLED)",
          color: "bg-blue-950/20 border-blue-800/40 text-blue-400"
        };
      case "empty":
        return {
          banner: "DIAGNOSTIC STATUS: TELEMETRY CALIBRATION STANDBY (EMPTY STATES ENABLED)",
          color: "bg-zinc-900/60 border-zinc-800/50 text-zinc-400"
        };
      case "error":
        return {
          banner: "DIAGNOSTIC STATUS: SIMULATING GROUND-LINK AND INSTRUMENT FAILURE (ERROR STATES ENABLED)",
          color: "bg-red-950/20 border-red-800/40 text-red"
        };
      default:
        return {
          banner: "ADITYA-L1 SWONC GROUND OPERATION CONTROLLER - RECEIVING LIVE TELEMETRY",
          color: "bg-emerald-950/25 border-emerald-800/20 text-emerald"
        };
    }
  };

  const diagConfig = getDiagnosticsConfig();

  const handleResetState = () => {
    setDashboardState("normal");
  };

  return (
    <div className="flex-1 bg-zinc-950 text-foreground p-6 overflow-auto">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Top Diagnostics Control Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border border-border/40 bg-zinc-900/30 p-3 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-electric-blue shrink-0" />
            <div className="flex items-center gap-2">
              <span className={`text-[10px] md:text-xs font-mono border px-2 py-0.5 rounded font-medium ${diagConfig.color}`}>
                {diagConfig.banner}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono text-muted-foreground uppercase mr-1.5 flex items-center gap-1">
              <Sliders className="h-3 w-3" /> State Injector:
            </span>
            {(["normal", "loading", "empty", "error"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setDashboardState(st)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-all uppercase font-medium ${
                  dashboardState === st
                    ? st === "normal"
                      ? "bg-emerald/20 border-emerald/50 text-emerald"
                      : st === "loading"
                      ? "bg-electric-blue/20 border-electric-blue/50 text-electric-blue"
                      : st === "empty"
                      ? "bg-zinc-800 border-zinc-700 text-zinc-300"
                      : "bg-red/20 border-red/50 text-red"
                    : "border-border/20 hover:bg-muted text-muted-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* 3-Column Dashboard Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Mission Status, Health, Alerts */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="h-[210px] shrink-0">
              <MissionStatusCard state={dashboardState} onRetry={handleResetState} />
            </div>
            
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm flex-1 flex flex-col justify-between">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Solar Health Index
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center p-3">
                <SolarHealthIndex state={dashboardState} onRetry={handleResetState} />
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50 backdrop-blur-sm h-[320px] flex flex-col justify-between">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Space Weather Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-3 overflow-hidden">
                <AlertPanel state={dashboardState} onRetry={handleResetState} />
              </CardContent>
            </Card>
          </div>

          {/* Center Column: Charts, Timeline, Telemetry Log */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm flex-1 flex flex-col justify-between p-3 min-h-[380px]">
              <div className="flex-1">
                <DualXrayChart state={dashboardState} onRetry={handleResetState} />
              </div>
            </Card>
            
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm p-4 shrink-0">
              <CardHeader className="p-0 pb-3 border-b border-border/10 mb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Space Weather Prediction Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <PredictionTimeline state={dashboardState} onRetry={handleResetState} />
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50 backdrop-blur-sm p-3 shrink-0 h-[310px] flex flex-col justify-between">
              <div className="flex-1 overflow-hidden">
                <LiveTelemetryPanel state={dashboardState} onRetry={handleResetState} />
              </div>
            </Card>
          </div>

          {/* Right Column: Predictions, Explainable AI, Fingerprints */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="h-[210px] shrink-0">
              <HistoricalSimilarityCard state={dashboardState} onRetry={handleResetState} />
            </div>

            <div className="flex-1 min-h-[280px]">
              <ExplainableAICard state={dashboardState} onRetry={handleResetState} />
            </div>

            <Card className="border-border/40 bg-card/50 backdrop-blur-sm flex-1 flex flex-col justify-between min-h-[320px]">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Signature Behaviour Fingerprint
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <BehaviourFingerprint state={dashboardState} onRetry={handleResetState} />
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
