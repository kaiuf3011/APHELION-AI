"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Server, Cpu, Database, Bell, Radio, ShieldAlert, Sparkles, RefreshCw, Layers, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ComponentState } from "./mission-status-card";

interface ArchNode {
  id: string;
  name: string;
  category: "space" | "ingest" | "process" | "predict" | "output";
  x: number;
  y: number;
  icon: any;
  status: "nominal" | "degraded" | "inactive";
  details: {
    description: string;
    throughput?: string;
    latency?: string;
    payloadFormat?: string;
    activeThreads?: string;
  };
}

const initialNodes: ArchNode[] = [
  {
    id: "l1",
    name: "Aditya-L1",
    category: "space",
    x: 80,
    y: 80,
    icon: Radio,
    status: "nominal",
    details: {
      description: "ISRO Solar Mission Spacecraft sitting at Lagrangian Point L1 (~1.5M km from Earth).",
      throughput: "2.4 Mbps Downlink",
      payloadFormat: "CCSDS Telemetry Packets",
      latency: "4.8s (Light Travel Time)"
    }
  },
  {
    id: "solexs",
    name: "SoLEXS Instrument",
    category: "space",
    x: 240,
    y: 40,
    icon: Layers,
    status: "nominal",
    details: {
      description: "Solar Low Energy X-ray Spectrometer monitoring soft X-rays in 1-22 keV.",
      throughput: "64 Kbps Peak",
      payloadFormat: "Raw Photon Counts",
      latency: "0.2s Packetization"
    }
  },
  {
    id: "hel1os",
    name: "HEL1OS Instrument",
    category: "space",
    x: 240,
    y: 120,
    icon: Layers,
    status: "nominal",
    details: {
      description: "High Energy L1 Orbiting Spectrometer monitoring hard X-rays in 10-150 keV.",
      throughput: "128 Kbps Peak",
      payloadFormat: "Raw Photon Counts",
      latency: "0.2s Packetization"
    }
  },
  {
    id: "sync",
    name: "Data Ingestion Sync",
    category: "ingest",
    x: 400,
    y: 80,
    icon: Database,
    status: "nominal",
    details: {
      description: "Telemetry ingestion hub coordinating packet alignment, timing, and decompression.",
      throughput: "512 Kbps Mean",
      payloadFormat: "Structured JSON DataFrame",
      latency: "1.2s Sync Buffer",
      activeThreads: "8 / 16 threads"
    }
  },
  {
    id: "engine",
    name: "Solar Behaviour Engine",
    category: "process",
    x: 560,
    y: 80,
    icon: Cpu,
    status: "nominal",
    details: {
      description: "Core physical analyzer measuring rise velocity, lag, thermal delay, and correlations.",
      throughput: "1,200 Ops/Sec",
      payloadFormat: "Derived Feature Vectors",
      latency: "240ms Processing",
      activeThreads: "16 / 16 threads"
    }
  },
  {
    id: "predict",
    name: "XGBoost Forecast Core",
    category: "predict",
    x: 720,
    y: 80,
    icon: Server,
    status: "nominal",
    details: {
      description: "Gradient-boosted classifier predicting flare class from Solar Behaviour Engine fingerprints, with SHAP-based per-prediction attribution.",
      throughput: "50 Inferences/Sec",
      payloadFormat: "Risk Probabilities List",
      latency: "12ms CPU Inference",
      activeThreads: "XGBoost (CPU)"
    }
  },
  {
    id: "alerts",
    name: "Alert dispatcher",
    category: "output",
    x: 880,
    y: 80,
    icon: Bell,
    status: "nominal",
    details: {
      description: "Disseminator transmitting critical alerts to ISRO SWONC and global space weather services.",
      throughput: "Broadcast",
      payloadFormat: "Cap V1.2 Alert Webhooks",
      latency: "< 50ms Dispatch"
    }
  }
];

interface ArchitectureViewerProps {
  state?: ComponentState;
  onRetry?: () => void;
}

export function ArchitectureViewer({ state = "normal", onRetry }: ArchitectureViewerProps) {
  const [selectedNode, setSelectedNode] = useState<ArchNode | null>(initialNodes[0]);

  if (state === "loading") {
    return (
      <div className="w-full min-h-[360px] flex flex-col justify-between p-4 animate-pulse">
        <div className="h-6 w-1/3 bg-muted/40 rounded mb-4" />
        <div className="flex-1 bg-muted/20 border border-dashed border-border/40 rounded flex items-center justify-center">
          <Server className="h-10 w-10 text-muted-foreground/30" />
        </div>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="w-full min-h-[360px] flex flex-col items-center justify-center p-8 text-center border border-dashed border-border/40 rounded-lg">
        <Server className="h-10 w-10 text-muted-foreground/30 mb-2 animate-bounce" />
        <h4 className="text-sm font-semibold text-muted-foreground">Pipeline Inactive</h4>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-[280px]">
          No active ingestion pipelines detected. Please configure telemetry interfaces.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="w-full min-h-[360px] flex flex-col items-center justify-center p-8 text-center border border-red/20 rounded-lg bg-red-950/5">
        <ShieldAlert className="h-10 w-10 text-red/60 mb-2 animate-pulse" />
        <h4 className="text-sm font-semibold text-red">Pipeline Inspection Failed</h4>
        <p className="text-xs text-red/60 mt-1 max-w-[320px] font-mono">
          ERR_ARCH_DISCOVERY_TIMEOUT: Pipeline manager daemon failed to return diagnostic state maps.
        </p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="mt-4 text-xs flex items-center gap-1.5 px-3 py-1.5 rounded bg-red/10 border border-red/30 text-red hover:bg-red/20 transition-all font-mono"
          >
            <RefreshCw className="h-3 w-3" /> Reconnect Discovery
          </button>
        )}
      </div>
    );
  }

  const handleNodeClick = (node: ArchNode) => {
    setSelectedNode(node);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full p-2 h-full min-h-[380px]">
      {/* SVG Canvas for Diagram */}
      <div className="flex-1 bg-zinc-950/80 border border-border/40 rounded-lg overflow-x-auto relative flex items-center justify-center p-4">
        {/* Connection flow styling */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes dash-flow {
            to {
              stroke-dashoffset: -20;
            }
          }
          .flowing-path {
            stroke-dasharray: 5, 5;
            animation: dash-flow 1.5s linear infinite;
          }
        `}} />

        <svg viewBox="0 0 960 160" width="100%" className="min-w-[800px] h-40">
          {/* Animated Connecting Paths */}
          {/* L1 -> SoLEXS & HEL1OS */}
          <path d="M 80 80 L 160 80 Q 200 40 240 40" fill="none" stroke="hsl(var(--muted-foreground))" opacity={0.3} strokeWidth={2} />
          <path d="M 80 80 L 160 80 Q 200 120 240 120" fill="none" stroke="hsl(var(--muted-foreground))" opacity={0.3} strokeWidth={2} />
          <path d="M 80 80 L 160 80 Q 200 40 240 40" fill="none" stroke="var(--color-electric-blue)" strokeWidth={1.5} className="flowing-path" />
          <path d="M 80 80 L 160 80 Q 200 120 240 120" fill="none" stroke="var(--color-electric-blue)" strokeWidth={1.5} className="flowing-path" />

          {/* SoLEXS & HEL1OS -> Sync */}
          <path d="M 240 40 Q 320 40 350 80 L 400 80" fill="none" stroke="hsl(var(--muted-foreground))" opacity={0.3} strokeWidth={2} />
          <path d="M 240 120 Q 320 120 350 80 L 400 80" fill="none" stroke="hsl(var(--muted-foreground))" opacity={0.3} strokeWidth={2} />
          <path d="M 240 40 Q 320 40 350 80 L 400 80" fill="none" stroke="var(--color-cyan)" strokeWidth={1.5} className="flowing-path" />
          <path d="M 240 120 Q 320 120 350 80 L 400 80" fill="none" stroke="var(--color-cyan)" strokeWidth={1.5} className="flowing-path" />

          {/* Sync -> Engine -> Predict -> Alerts */}
          <line x1={400} y1={80} x2={560} y2={80} stroke="hsl(var(--muted-foreground))" opacity={0.3} strokeWidth={2} />
          <line x1={400} y1={80} x2={560} y2={80} stroke="var(--color-emerald)" strokeWidth={1.5} className="flowing-path" />

          <line x1={560} y1={80} x2={720} y2={80} stroke="hsl(var(--muted-foreground))" opacity={0.3} strokeWidth={2} />
          <line x1={560} y1={80} x2={720} y2={80} stroke="var(--color-amber)" strokeWidth={1.5} className="flowing-path" />

          <line x1={720} y1={80} x2={880} y2={80} stroke="hsl(var(--muted-foreground))" opacity={0.3} strokeWidth={2} />
          <line x1={720} y1={80} x2={880} y2={80} stroke="var(--color-red)" strokeWidth={1.5} className="flowing-path" />

          {/* Nodes */}
          {initialNodes.map((node) => {
            const Icon = node.icon;
            const isSelected = selectedNode?.id === node.id;
            
            const colorClass = 
              node.category === "space" ? "fill-electric-blue text-electric-blue" :
              node.category === "ingest" ? "fill-cyan text-cyan" :
              node.category === "process" ? "fill-emerald text-emerald" :
              node.category === "predict" ? "fill-amber text-amber" :
              "fill-red text-red";

            const strokeColor = 
              node.category === "space" ? "var(--color-electric-blue)" :
              node.category === "ingest" ? "var(--color-cyan)" :
              node.category === "process" ? "var(--color-emerald)" :
              node.category === "predict" ? "var(--color-amber)" :
              "var(--color-red)";

            return (
              <g 
                key={node.id} 
                className="cursor-pointer"
                onClick={() => handleNodeClick(node)}
              >
                {/* Node outer outline */}
                <circle 
                  cx={node.x} 
                  cy={node.y} 
                  r={isSelected ? 26 : 22} 
                  className="fill-zinc-950 stroke-[2] transition-all"
                  stroke={isSelected ? strokeColor : "hsl(var(--border))"}
                  style={{
                    filter: isSelected ? `drop-shadow(0 0 8px ${strokeColor}BF)` : "none"
                  }}
                />
                
                {/* Icon wrapper */}
                <foreignObject 
                  x={node.x - 10} 
                  y={node.y - 10} 
                  width={20} 
                  height={20}
                  className="pointer-events-none"
                >
                  <Icon className={`h-5 w-5 ${isSelected ? "text-foreground" : "text-muted-foreground"} transition-colors`} />
                </foreignObject>

                {/* Node labels */}
                <text 
                  x={node.x} 
                  y={node.y + 36} 
                  textAnchor="middle" 
                  className={`text-[9px] font-mono font-semibold select-none uppercase tracking-wider ${isSelected ? "fill-white" : "fill-muted-foreground"}`}
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Inspector Panel */}
      <div className="w-full lg:w-80 bg-zinc-900/40 border border-border/40 rounded-lg p-4 flex flex-col justify-between">
        {selectedNode ? (
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`p-1.5 rounded-full ${
                  selectedNode.category === "space" ? "bg-electric-blue/15 text-electric-blue" :
                  selectedNode.category === "ingest" ? "bg-cyan/15 text-cyan" :
                  selectedNode.category === "process" ? "bg-emerald/15 text-emerald" :
                  selectedNode.category === "predict" ? "bg-amber/15 text-amber" :
                  "bg-red/15 text-red"
                }`}>
                  <selectedNode.icon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{selectedNode.name}</h4>
                  <span className="text-[9px] font-mono uppercase text-muted-foreground">ID: {selectedNode.id}</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal mt-2">
                {selectedNode.details.description}
              </p>
            </div>

            <div className="space-y-2 border-t border-border/20 pt-3.5 font-mono text-[10px]">
              <span className="uppercase text-[9px] text-muted-foreground font-semibold">Diagnostic Parameters</span>
              {selectedNode.details.throughput && (
                <div className="flex justify-between border-b border-border/10 py-1">
                  <span className="text-muted-foreground">Data Rate:</span>
                  <span className="text-foreground">{selectedNode.details.throughput}</span>
                </div>
              )}
              {selectedNode.details.payloadFormat && (
                <div className="flex justify-between border-b border-border/10 py-1">
                  <span className="text-muted-foreground">Payload Schema:</span>
                  <span className="text-foreground">{selectedNode.details.payloadFormat}</span>
                </div>
              )}
              {selectedNode.details.latency && (
                <div className="flex justify-between border-b border-border/10 py-1">
                  <span className="text-muted-foreground">Internal Latency:</span>
                  <span className="text-foreground">{selectedNode.details.latency}</span>
                </div>
              )}
              {selectedNode.details.activeThreads && (
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Worker Allocation:</span>
                  <span className="text-foreground">{selectedNode.details.activeThreads}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 pt-2 text-[10px] text-emerald font-mono">
              <CheckCircle2 className="h-3 w-3" /> PIPELINE DIAGNOSTIC PASS
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Layers className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs">Click a pipeline node to inspect diagnostic metadata.</p>
          </div>
        )}
      </div>
    </div>
  );
}
