"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResearchTimeline } from "@/components/research-timeline";
import { BookOpen, HelpCircle, Layers, Settings } from "lucide-react";

export default function ResearchExplorer() {
  return (
    <div className="flex-1 bg-zinc-950 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-border/20 pb-4">
          <span className="text-[10px] font-mono text-emerald uppercase tracking-widest font-bold">Scientific documentation</span>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Research Explorer</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Examine the physics of solar flares, magnetic reconnection models, and Aditya-L1 payload instruments.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Interactive Research Timeline */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm p-4 flex-1">
              <CardHeader className="p-0 pb-3 border-b border-border/10 mb-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Solar Flare Evolution Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ResearchTimeline />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Physics Concepts & Instrument Details */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            
            {/* The Neupert Effect */}
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm p-4">
              <CardHeader className="p-0 pb-2 border-b border-border/10">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-emerald" /> The Neupert Effect
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-3 space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                <p>
                  In solar physics, the <span className="text-foreground font-semibold">Neupert Effect</span> describes the relationship between non-thermal (Hard X-ray) emissions and thermal (Soft X-ray) emissions.
                </p>
                <div className="p-3 bg-zinc-950/80 border border-border/40 rounded font-mono text-center text-electric-blue text-[13px] my-2">
                  {"\\[\\frac{dF_{SXR}(t)}{dt} \\propto F_{HXR}(t)\\]"}
                </div>
                <p>
                  This governs that the rate of change of Soft X-ray flux is proportional to the instantaneous Hard X-ray flux. Physically, the Hard X-rays represent energy deposited by accelerated electron beams at the loop footpoints, which drives rapid chromospheric evaporation. The evaporated hot plasma fills the loops, giving rise to Soft X-ray emission.
                </p>
              </CardContent>
            </Card>

            {/* Instrument Payload Specifications */}
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm p-4">
              <CardHeader className="p-0 pb-2 border-b border-border/10">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-cyan" /> Aditya-L1 Payload Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-3 space-y-3 text-xs font-mono">
                
                {/* SoLEXS */}
                <div className="space-y-1 pb-2.5 border-b border-border/15">
                  <div className="flex justify-between items-center text-foreground font-semibold">
                    <span>SoLEXS (Solar Low Energy X-ray Spectrometer)</span>
                    <span className="text-[9px] px-1 bg-emerald/10 border border-emerald/20 text-emerald rounded">ACTIVE</span>
                  </div>
                  <p className="text-[10px] font-sans text-muted-foreground leading-normal mt-1">
                    Measures solar soft X-ray flux in the energy range of 1 to 22 keV. Utilizing state-of-the-art Silicon Drift Detectors, it provides high spectral resolution to determine coronal temperatures and emission measures.
                  </p>
                </div>

                {/* HEL1OS */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center text-foreground font-semibold">
                    <span>HEL1OS (High Energy L1 Orbiting Spectrometer)</span>
                    <span className="text-[9px] px-1 bg-emerald/10 border border-emerald/20 text-emerald rounded">ACTIVE</span>
                  </div>
                  <p className="text-[10px] font-sans text-muted-foreground leading-normal mt-1">
                    Observes hard X-ray emissions in the range of 10 to 150 keV. It studies non-thermal particle acceleration processes during the early impulsive phase, resolving the dynamics of magnetic reconnection.
                  </p>
                </div>

              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </div>
  );
}
