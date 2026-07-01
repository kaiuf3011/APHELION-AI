"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Activity, Zap, Thermometer, AlertOctagon, RefreshCw, ChevronRight, CheckCircle2 } from "lucide-react";
import { ComponentState } from "./mission-status-card";

interface Stage {
  num: string;
  title: string;
  shortDesc: string;
  physicsName: string;
  wavelengths?: string;
  instrument?: string;
  formula?: string;
  detailedDesc: string;
  icon: any;
  color: string;
}

const stages: Stage[] = [
  {
    num: "1",
    title: "Quiet Sun",
    shortDesc: "Baseline magnetic activity state.",
    physicsName: "Potential Field Configuration",
    wavelengths: "Visible, IR, Radio (> 1m)",
    instrument: "Ground Observatory / SUIT (Future)",
    formula: "\\nabla \\times B = 0",
    detailedDesc: "The solar atmosphere is in its lowest energy state. Magnetic field lines are close to potential configurations with minimal stress. Standard coronal heating processes maintain nominal temperatures (1-2 Million Kelvin).",
    icon: Sun,
    color: "text-emerald border-emerald/30 bg-emerald-950/10"
  },
  {
    num: "2",
    title: "Magnetic Stress",
    shortDesc: "Energy accumulation in the active region.",
    physicsName: "Flux Emergence & Shear",
    wavelengths: "EUV (171 Å, 193 Å)",
    instrument: "SUIT / VELC (Future)",
    formula: "E_{free} = E_{MHD} - E_{potential}",
    detailedDesc: "New magnetic flux emerges from the convection zone, shearing existing field lines. Free magnetic energy accumulates in the active region coronal loop systems, setting up structural instability thresholds.",
    icon: Activity,
    color: "text-cyan border-cyan/30 bg-cyan-950/10"
  },
  {
    num: "3",
    title: "Particle Acceleration",
    shortDesc: "Initial reconnection trigger.",
    physicsName: "Magnetic Reconnection (Impulsive)",
    wavelengths: "Hard X-Ray (10-150 keV), Radio Type III",
    instrument: "HEL1OS Instrument",
    formula: "E \\approx v \\times B",
    detailedDesc: "Magnetic reconnection triggers in the corona, creating strong electric fields. Electrons are accelerated downward along loop legs, colliding with the dense chromosphere and emitting Bremsstrahlung Hard X-rays.",
    icon: Zap,
    color: "text-electric-blue border-electric-blue/30 bg-electric-blue-950/10"
  },
  {
    num: "4",
    title: "Thermal Build-up",
    shortDesc: "Chromospheric plasma evaporation.",
    physicsName: "Chromospheric Evaporation (Neupert Effect)",
    wavelengths: "Soft X-Ray (1-8 Å, 0.5-4 Å)",
    instrument: "SoLEXS Instrument",
    formula: "\\frac{d}{dt}(EM) \\propto F_{HXR}",
    detailedDesc: "Chromospheric material is heated rapidly by accelerated particles, causing plasma to evaporate upward into the loop. Density and temperature spike, triggering a rapid rise in Soft X-ray emissions.",
    icon: Thermometer,
    color: "text-amber border-amber/30 bg-amber-950/10"
  },
  {
    num: "5",
    title: "Solar Flare Peak",
    shortDesc: "Peak thermal and non-thermal emission.",
    physicsName: "Thermal Emission Peak",
    wavelengths: "X-Ray, EUV, H-alpha, White Light",
    instrument: "SoLEXS / HEL1OS Payloads",
    formula: "T_{max} \\approx 10-30\\text{ MK}",
    detailedDesc: "The active region reaches maximum thermal emission across the electromagnetic spectrum. Coronal Mass Ejection (CME) launch events typically coincide with this impulsive peak boundary.",
    icon: AlertOctagon,
    color: "text-red border-red/30 bg-red-950/10"
  },
  {
    num: "6",
    title: "Recovery Phase",
    shortDesc: "Coronal loop cooling and relaxation.",
    physicsName: "Conductive & Radiative Cooling",
    wavelengths: "EUV, Soft X-Ray Decay",
    instrument: "SoLEXS Instrument",
    formula: "\\tau_{cooling} \\approx 1-3\\text{ hours}",
    detailedDesc: "Energy inputs cease. Coronal loop systems gradually cool down via thermal conduction to the chromosphere and radiative losses. The magnetic structure relaxes back toward a stable configuration.",
    icon: Sun,
    color: "text-emerald border-emerald/30 bg-emerald-950/10"
  }
];

interface ResearchTimelineProps {
  state?: ComponentState;
  onRetry?: () => void;
}

export function ResearchTimeline({ state = "normal", onRetry }: ResearchTimelineProps) {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  if (state === "loading") {
    return (
      <div className="space-y-4 w-full p-2 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="h-8 w-8 rounded-full bg-muted/40" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-1/3 bg-muted/40 rounded" />
              <div className="h-3 w-5/6 bg-muted/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border/40 rounded-lg">
        <Sun className="h-10 w-10 text-muted-foreground/30 mb-2 animate-spin" />
        <h4 className="text-sm font-semibold text-muted-foreground">Physics Engine Standby</h4>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-[240px]">
          Unable to trace timeline model. Ensure the physics-informed module is activated.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-red/20 rounded-lg bg-red-950/5">
        <AlertOctagon className="h-10 w-10 text-red/60 mb-2 animate-pulse" />
        <h4 className="text-sm font-semibold text-red">Physics Parsing Error</h4>
        <p className="text-xs text-red/60 mt-1 max-w-[280px] font-mono">
          ERR_TIMELINE_MHD_SOLVER: Non-linear force-free field (NLFFF) solver failed to converge.
        </p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="mt-4 text-xs flex items-center gap-1.5 px-3 py-1.5 rounded bg-red/10 border border-red/30 text-red hover:bg-red/20 transition-all font-mono"
          >
            <RefreshCw className="h-3 w-3" /> Retry MHD Solver
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full p-2 font-sans">
      <div className="relative border-l border-border/40 ml-4 space-y-6">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isExpanded = hoveredStage === stage.num;

          return (
            <div 
              key={stage.num} 
              className="relative pl-6 group cursor-pointer"
              onMouseEnter={() => setHoveredStage(stage.num)}
              onMouseLeave={() => setHoveredStage(null)}
            >
              {/* Timeline dot and line connecting icon */}
              <div 
                className={`absolute left-[-17px] top-1.5 w-8 h-8 rounded-full border bg-zinc-950 flex items-center justify-center font-mono font-bold text-xs transition-all z-10 ${
                  isExpanded ? "border-electric-blue text-electric-blue scale-110 shadow-[0_0_8px_rgba(0,112,243,0.3)]" : "border-border text-muted-foreground group-hover:border-foreground group-hover:text-foreground"
                }`}
              >
                {stage.num}
              </div>

              {/* Title & Stage Details */}
              <div className="pt-0.5">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-electric-blue transition-colors flex items-center gap-2">
                  {stage.title}
                  <ChevronRight className={`h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ${isExpanded ? "rotate-90" : ""}`} />
                </h3>
                
                <p className="text-xs text-muted-foreground leading-normal mt-0.5">
                  {stage.shortDesc}
                </p>

                {/* Animated Dropdown Block */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden mt-2.5"
                    >
                      <div className={`p-3 rounded border text-xs font-mono space-y-2.5 leading-relaxed ${stage.color}`}>
                        <div className="flex justify-between border-b border-border/10 pb-1.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Physics Phase:</span>
                          <span className="text-foreground text-right">{stage.physicsName}</span>
                        </div>
                        
                        <p className="text-[10px] font-sans text-foreground/80 leading-normal">
                          {stage.detailedDesc}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-[9px] pt-1.5 border-t border-border/10">
                          {stage.wavelengths && (
                            <div>
                              <span className="text-muted-foreground uppercase block font-bold">Spectral Band:</span>
                              <span className="text-foreground">{stage.wavelengths}</span>
                            </div>
                          )}
                          {stage.instrument && (
                            <div>
                              <span className="text-muted-foreground uppercase block font-bold">Key Instrument:</span>
                              <span className="text-foreground">{stage.instrument}</span>
                            </div>
                          )}
                          {stage.formula && (
                            <div className="col-span-2 mt-1">
                              <span className="text-muted-foreground uppercase block font-bold">Governing MHD Eq:</span>
                              <span className="text-electric-blue font-bold text-[10px]">{stage.formula}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
