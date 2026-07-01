"use client";

import { Sparkles, Brain, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ComponentState } from "./mission-status-card";

interface ExplainableAICardProps {
  state?: ComponentState;
  onRetry?: () => void;
}

export function ExplainableAICard({ state = "normal", onRetry }: ExplainableAICardProps) {
  if (state === "loading") {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm h-full flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="h-4 w-32 bg-muted/40 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col justify-center">
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted/40 rounded animate-pulse" />
            <div className="h-3 w-5/6 bg-muted/40 rounded animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="h-2 w-full bg-muted/40 rounded animate-pulse" />
            <div className="h-2 w-2/3 bg-muted/40 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state === "empty") {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm h-full flex flex-col justify-center items-center p-6 text-center">
        <Brain className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <h4 className="text-sm font-semibold text-muted-foreground">AI Core Inactive</h4>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px]">
          Awaiting telemetry trigger events to launch explanatory physics models.
        </p>
      </Card>
    );
  }

  if (state === "error") {
    return (
      <Card className="border-red/40 bg-red-950/10 backdrop-blur-sm h-full flex flex-col justify-center p-6 border">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red mt-0.5 shrink-0 animate-bounce" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-red">XAI Inference Error</h3>
            <p className="text-xs text-red/80 font-mono">
              ERR_XAI_VALIDATION: Core physics constraints violated (MHD flux divergence limit exceeded).
            </p>
            {onRetry && (
              <button 
                onClick={onRetry}
                className="mt-3 text-xs flex items-center gap-1.5 px-2.5 py-1 rounded bg-red/20 hover:bg-red/35 text-red transition-all border border-red/30"
              >
                <RefreshCw className="h-3 w-3" /> Re-initialize Weights
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
            <Brain className="h-3.5 w-3.5 text-electric-blue" />
            Explainable AI (XAI)
          </CardTitle>
          <div className="flex items-center gap-1 text-[10px] text-emerald font-mono">
            <CheckCircle2 className="h-3 w-3" /> PINN VALIDATED
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {/* Prediction Header */}
        <div className="bg-muted/15 p-2.5 rounded border border-border/10">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold text-foreground">Forecast: M8.4 Flare Imminent</span>
            <span className="font-mono font-bold text-amber bg-amber/10 px-1.5 py-0.5 rounded text-[10px]">
              89.4% CONFIDENCE
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-normal">
            Neural network models detect pre-flare thermal accumulation patterns. Estimated lead time: 14 mins.
          </p>
        </div>

        {/* Contributing Signals */}
        <div className="space-y-2">
          <span className="font-mono uppercase tracking-widest text-[9px] text-muted-foreground font-semibold">
            Signal Attribution Weights
          </span>
          <div className="space-y-1.5 font-mono">
            <div>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-muted-foreground">Magnetic Shear Index</span>
                <span className="text-foreground">42%</span>
              </div>
              <Progress value={42} className="h-1 bg-muted/40" />
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-muted-foreground">SoLEXS X-Ray Flux Gradient</span>
                <span className="text-foreground">29%</span>
              </div>
              <Progress value={29} className="h-1 bg-muted/40" />
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-muted-foreground">HEL1OS Reconnection Peak</span>
                <span className="text-foreground">18%</span>
              </div>
              <Progress value={18} className="h-1 bg-muted/40" />
            </div>
          </div>
        </div>

        {/* Physics Reasoning */}
        <div className="space-y-1">
          <span className="font-mono uppercase tracking-widest text-[9px] text-muted-foreground font-semibold">
            Physics reasoning
          </span>
          <p className="text-muted-foreground leading-relaxed text-[11px]">
            Model weights align with the <span className="text-foreground font-medium">Neupert Effect</span>: 
            the integrated Hard X-ray pulse (18%) maps directly to the onset slope of Soft X-ray emissions (29%), confirming chromospheric evaporation is underway.
          </p>
        </div>

        {/* Validation Footers */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20 text-[10px] font-mono text-muted-foreground">
          <div>
            <span>Model: </span>
            <span className="text-foreground">SolarNet-v4.2</span>
          </div>
          <div>
            <span>MHD constraint: </span>
            <span className="text-emerald">Passed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
