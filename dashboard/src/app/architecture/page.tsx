"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArchitectureViewer } from "@/components/architecture-viewer";
import { Cpu, Server, Shield, Share2 } from "lucide-react";

export default function Architecture() {
  return (
    <div className="flex-1 bg-zinc-950 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-border/20 pb-4">
          <span className="text-[10px] font-mono text-electric-blue uppercase tracking-widest font-bold">System Architecture</span>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Instrument & Processing Architecture</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Map out the end-to-end data transmission, preprocessing, feature extraction, and neural network inference pipelines.
          </p>
        </div>

        {/* Interactive Viewer Card */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm p-4">
          <CardHeader className="p-0 pb-3 border-b border-border/10 mb-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Interactive Pipeline Diagram</span>
              <span className="text-[9px] font-mono text-electric-blue">Click nodes to inspect data models</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ArchitectureViewer />
          </CardContent>
        </Card>

        {/* Pipeline Specifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-muted-foreground leading-relaxed font-sans">
          
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm p-4 space-y-3">
            <CardHeader className="p-0 pb-2 border-b border-border/10">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-emerald" /> Modular Design & Future Expansion
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-1 space-y-2">
              <p>
                APHELION AI's backend is fully decoupled from the UI layer to allow integration with external server processes and MCP tools.
              </p>
              <div className="space-y-1 pt-2 font-mono text-[11px]">
                <div className="flex justify-between border-b border-border/10 py-1">
                  <span>Current Inputs:</span>
                  <span className="text-foreground font-semibold">SoLEXS (SXR), HEL1OS (HXR)</span>
                </div>
                <div className="flex justify-between border-b border-border/10 py-1">
                  <span>Planned Integrations:</span>
                  <span className="text-foreground font-semibold">VELC (Corona), SUIT (EUV/UV)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Ancillary Fields:</span>
                  <span className="text-foreground font-semibold">ASPEX (Solar Wind), PAPA (Plasma)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur-sm p-4 space-y-3">
            <CardHeader className="p-0 pb-2 border-b border-border/10">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-electric-blue" /> Physics-Informed Feature Engineering
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-1 space-y-2">
              <p>
                Rather than feeding raw flux arrays into a black-box network, the Solar Behaviour Engine first derives physically meaningful features, which a gradient-boosted (XGBoost) classifier then learns to map to flare class - with SHAP giving real per-prediction attribution back to each feature:
              </p>
              <ul className="list-disc pl-4 space-y-1 mt-1 text-[11px]">
                <li>Neupert-effect cross-correlation and HXR→SXR lag, computed directly from telemetry (Neupert 1968; Dennis &amp; Zarro 1993).</li>
                <li>Conductive/radiative cooling decay time constant, fit via log-linear regression on the post-peak SXR light curve.</li>
                <li>GOES 1-8Å classification thresholds (NOAA SWPC standard) applied consistently across simulation, retrieval, and forecasting.</li>
              </ul>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
