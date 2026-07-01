"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Activity, Zap, Shield, ChevronRight, Globe, Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SolarObservatory } from "@/components/solar-observatory";
import { ScientificMetricsGrid } from "@/components/scientific-metrics-grid";
import { ResearchTimeline } from "@/components/research-timeline";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-foreground overflow-x-hidden relative">
      
      {/* Background drifting stars particle simulation (pure CSS, lightweight) */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes drift {
          0% { transform: translateY(0px) rotate(0deg); opacity: 0.1; }
          50% { opacity: 0.4; }
          100% { transform: translateY(-120px) rotate(360deg); opacity: 0.1; }
        }
        .star-particle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 50%;
          pointer-events: none;
        }
      `}} />

      {/* Scattered background ambient particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-20 opacity-30">
        {Array.from({ length: 25 }).map((_, i) => {
          const style = {
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `drift ${20 + Math.random() * 30}s linear infinite`,
            animationDelay: `${-Math.random() * 20}s`
          };
          return <div key={i} className="star-particle" style={style} />;
        })}
      </div>

      {/* Hero Section: Left Panel (Text and CTAs), Right Panel (3D Sun Visualization) */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-6 py-12 md:py-20 max-w-7xl mx-auto w-full z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
          
          {/* Left Column: Heading, Subheading, CTAs */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center rounded border border-cyan/20 bg-cyan/5 px-3 py-1 text-[10px] font-mono font-bold text-cyan uppercase tracking-widest">
                ADITYA-L1 SWONC MONITOR
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-heading font-extrabold uppercase tracking-wide leading-tight text-3xl md:text-5xl lg:text-6xl text-foreground max-w-2xl"
            >
              Understanding Solar Behaviour Before It Becomes Space Weather.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="font-sans font-medium text-xs md:text-sm lg:text-base text-muted-foreground max-w-xl leading-relaxed"
            >
              APHELION AI is a Physics-Informed Solar Flare Forecasting & Nowcasting Platform designed for ISRO's Space Weather Operations Center. Driven by SoLEXS and HEL1OS telemetry sync.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto"
            >
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center rounded border border-foreground/10 bg-foreground px-6 text-[10px] font-mono uppercase tracking-wider font-bold text-background transition-all hover:scale-[1.03] hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] gap-2"
              >
                Launch Dashboard <ArrowRight className="h-3.5 w-3.5 text-background" />
              </Link>
              <Link
                href="/research"
                className="inline-flex h-11 items-center justify-center rounded border border-border/80 bg-zinc-900/30 backdrop-blur-sm px-6 text-[10px] font-mono uppercase tracking-wider font-bold hover:bg-muted hover:scale-[1.03] gap-2 transition-all"
              >
                View Flare Physics
              </Link>
            </motion.div>
          </div>

          {/* Right Column: 3D Sun and Satellite */}
          <div className="lg:col-span-5 flex items-center justify-center w-full relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-full"
            >
              <SolarObservatory />
            </motion.div>
          </div>

        </div>
      </section>

      {/* Verification Metrics Panel */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full border-t border-border/10">
        <div className="flex flex-col gap-1 mb-10 text-center md:text-left">
          <span className="text-[10px] font-mono text-electric-blue uppercase tracking-widest font-bold">Verification parameters</span>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Active Platform Performance</h2>
        </div>
        <ScientificMetricsGrid />
      </section>

      {/* Physics Timeline Walkthrough */}
      <section className="py-20 px-6 bg-zinc-900/5 border-y border-border/10 w-full">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 space-y-2">
            <span className="text-[10px] font-mono text-cyan uppercase tracking-widest font-bold">Flare Evolution Lifecycle</span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Interactive Solar Physics Timeline</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Hover over each phase to inspect physical characteristics, wavelengths, governing equations, and instruments.
            </p>
          </div>
          <div className="bg-zinc-900/30 p-4 md:p-8 rounded-lg border border-border/40 backdrop-blur-sm shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
            <ResearchTimeline />
          </div>
        </div>
      </section>

      {/* Technology Specifications Ribbon */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full text-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-xs font-mono">
          <div className="space-y-2 border border-border/30 p-5 rounded-lg bg-zinc-900/10 hover:border-border/60 transition-all hover:scale-[1.02]">
            <Zap className="h-6 w-6 text-amber mx-auto mb-2" />
            <h4 className="font-semibold text-foreground text-sm uppercase">Physics-Informed ML</h4>
            <p className="text-muted-foreground leading-relaxed font-sans text-[11px] pt-1">
              Injects magnetohydrodynamic constraints directly into loss functions, guaranteeing physically plausible forecasts.
            </p>
          </div>
          <div className="space-y-2 border border-border/30 p-5 rounded-lg bg-zinc-900/10 hover:border-border/60 transition-all hover:scale-[1.02]">
            <Globe className="h-6 w-6 text-electric-blue mx-auto mb-2" />
            <h4 className="font-semibold text-foreground text-sm uppercase">Dual-Payload Sync</h4>
            <p className="text-muted-foreground leading-relaxed font-sans text-[11px] pt-1">
              Integrates HEL1OS hard X-ray counts and SoLEXS soft X-ray fluxes to resolve temporal lag coefficients.
            </p>
          </div>
          <div className="space-y-2 border border-border/30 p-5 rounded-lg bg-zinc-900/10 hover:border-border/60 transition-all hover:scale-[1.02]">
            <Radio className="h-6 w-6 text-cyan mx-auto mb-2" />
            <h4 className="font-semibold text-foreground text-sm uppercase">Real-Time Ingestion</h4>
            <p className="text-muted-foreground leading-relaxed font-sans text-[11px] pt-1">
              Supports sub-second telemetry packet stream demuxing directly from ISRO Indian Deep Space Network downlinks.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
