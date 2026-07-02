"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HistoricalSimilarityCard } from "@/components/historical-similarity-card";
import { RealEventReplay } from "@/components/real-event-replay";
import { Search, Calendar, FileText, Loader2, AlertCircle } from "lucide-react";
import { fetchHistoryEvents, HistoricalEventDto } from "@/lib/api";

export default function HistoricalAnalysis() {
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEventDto | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const query = useQuery({
    queryKey: ["history-events"],
    queryFn: fetchHistoryEvents,
    refetchInterval: 8000,
  });

  const events = query.data?.events ?? [];

  useEffect(() => {
    if (!selectedEvent && events.length > 0) {
      setSelectedEvent(events[0]);
    }
  }, [events, selectedEvent]);

  const filteredEvents = events.filter(
    (e) => e.id.toLowerCase().includes(searchQuery.toLowerCase()) || e.goesClass.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 bg-zinc-950 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="border-b border-border/20 pb-4">
          <span className="text-[10px] font-mono text-cyan uppercase tracking-widest font-bold">Space weather archives</span>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Historical Analysis Explorer</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Compare active solar flare geometries and Neupert decay curves with documented historical events.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* Left Column: Search & Events list */}
          <div className="lg:col-span-4 flex flex-col gap-4">

            {/* Search Input */}
            <div className="relative font-mono">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search archive (e.g. SOL2003)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/40 border border-border/40 rounded pl-9 pr-4 py-2.5 text-xs text-foreground focus:border-cyan outline-none transition-colors"
              />
            </div>

            {/* Event List */}
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm flex-1 p-2 overflow-hidden flex flex-col">
              <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest p-2 border-b border-border/10">
                Matching Archive Indices
              </span>
              <div className="space-y-1 mt-2 flex-1 overflow-auto max-h-[400px] pr-1">
                {query.isLoading && (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
                {query.isError && (
                  <div className="flex flex-col items-center justify-center py-8 text-red/70 text-center px-4">
                    <AlertCircle className="h-5 w-5 mb-2" />
                    <span className="text-[10px]">Could not reach archive API.</span>
                  </div>
                )}
                {filteredEvents.map((evt) => {
                  const isSelected = selectedEvent?.id === evt.id;
                  return (
                    <button
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      className={`w-full text-left p-2.5 rounded border text-xs font-mono transition-all flex items-center justify-between group ${
                        isSelected
                          ? "bg-cyan/15 border-cyan/50 text-foreground"
                          : "border-transparent hover:border-border/30 hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-semibold block">{evt.id}</span>
                        <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" /> {evt.date}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          evt.goesClass.startsWith("X") ? "bg-red/10 text-red border border-red/20" : "bg-amber/10 text-amber border border-amber/20"
                        }`}>
                          {evt.goesClass}
                        </span>
                        <span className="text-[10px] block mt-1 text-muted-foreground">{evt.similarity}% match</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Right Column: Comparative Inspection & Details */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* Historical Similarity Card (live, driven by current mission state) */}
            <div className="h-[210px] shrink-0">
              <HistoricalSimilarityCard />
            </div>

            {/* Inspected Event Details */}
            {selectedEvent && (
              <Card className="border-border/40 bg-card/50 backdrop-blur-sm flex-1 p-4 space-y-4">
                <CardHeader className="p-0 pb-2 border-b border-border/10">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-cyan" /> Event Profile Analysis: {selectedEvent.id}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 pt-2 space-y-4">

                  {/* Event Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {selectedEvent.desc}
                  </p>

                  {/* Technical Parameters Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 font-mono text-xs">
                    <div className="bg-muted/15 p-3 rounded border border-border/15">
                      <span className="text-[9px] text-muted-foreground uppercase block font-semibold">Classification</span>
                      <span className="text-sm font-bold text-foreground mt-1 block">{selectedEvent.goesClass}</span>
                    </div>
                    <div className="bg-muted/15 p-3 rounded border border-border/15">
                      <span className="text-[9px] text-muted-foreground uppercase block font-semibold">Peak Flux</span>
                      <span className="text-sm font-bold text-foreground mt-1 block">{selectedEvent.peakFlux}</span>
                    </div>
                    <div className="bg-muted/15 p-3 rounded border border-border/15">
                      <span className="text-[9px] text-muted-foreground uppercase block font-semibold">Flare Duration</span>
                      <span className="text-sm font-bold text-foreground mt-1 block">{selectedEvent.duration}</span>
                    </div>
                    <div className="bg-muted/15 p-3 rounded border border-border/15">
                      <span className="text-[9px] text-muted-foreground uppercase block font-semibold">HXR-SXR Lag</span>
                      <span className="text-sm font-bold text-foreground mt-1 block">{selectedEvent.lag}</span>
                    </div>
                  </div>

                  {/* Physics Comparison Insight */}
                  <div className="p-3 bg-cyan-950/10 border border-cyan-900/20 rounded text-xs">
                    <span className="font-semibold text-cyan block mb-1">Similarity to Current Live Telemetry</span>
                    <p className="text-muted-foreground leading-normal text-[11px]">
                      KDTree retrieval over the 7-dimensional behaviour fingerprint places <span className="text-foreground font-semibold">{selectedEvent.id}</span> at
                      {" "}{selectedEvent.similarity}% similarity to the current live SoLEXS/HEL1OS-derived fingerprint.
                    </p>
                  </div>

                  <p className="text-[10px] text-muted-foreground/60 font-mono border-t border-border/10 pt-2">
                    Data source: {selectedEvent.dataSource}
                  </p>

                </CardContent>
              </Card>
            )}

          </div>

        </div>

        <RealEventReplay />

      </div>
    </div>
  );
}
