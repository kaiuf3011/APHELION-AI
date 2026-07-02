/**
 * Typed client for the APHELION AI Flask backend (backend/app.py).
 * All dashboard components read live/derived data through these functions
 * instead of generating their own mock data.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------- //
// Telemetry

export interface TelemetryPoint {
  t: number;
  time: string;
  soft: number;
  hard: number;
}

export interface TelemetryLiveResponse {
  points: TelemetryPoint[];
  now: { soft: number; hard: number; goes_class: string };
}

export function fetchTelemetryLive(window = 90): Promise<TelemetryLiveResponse> {
  return apiFetch(`/telemetry/live?window=${window}`);
}

export interface TelemetryPacket {
  id: string;
  time: string;
  payload: "SoLEXS" | "HEL1OS" | "ASPEX" | "PAPA" | "SYS";
  parameter: string;
  value: string;
  status: "nominal" | "warning" | "critical";
}

export function fetchTelemetryPackets(limit = 20): Promise<{ packets: TelemetryPacket[] }> {
  return apiFetch(`/telemetry/packets?limit=${limit}`);
}

// ---------------------------------------------------------------------- //
// Mission status / health / alerts

export interface MissionStatusResponse {
  status: string;
  goes_class: string;
  downlink_packets: number;
  link_margin_dbhz: number;
  health_index: number;
  payloads: Record<string, { state: string; duty_cycle_pct: number }>;
}

export function fetchMissionStatus(): Promise<MissionStatusResponse> {
  return apiFetch("/mission/status");
}

export interface HealthIndexResponse {
  value: number;
  label: string;
  goes_class: string;
}

export function fetchHealthIndex(): Promise<HealthIndexResponse> {
  return apiFetch("/health-index");
}

export interface Alert {
  id: string;
  title: string;
  source: string;
  severity: "critical" | "high" | "medium" | "low";
  timestamp: string;
  description: string;
  acknowledged: boolean;
}

export function fetchAlerts(): Promise<{ alerts: Alert[] }> {
  return apiFetch("/alerts");
}

// ---------------------------------------------------------------------- //
// Behaviour fingerprint

export interface BehaviourMetric {
  key: string;
  name: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  trend_val: number;
  status: "nominal" | "watch" | "critical";
  description: string;
  history: number[];
}

export function fetchBehaviourFingerprint(): Promise<{ metrics: BehaviourMetric[]; goes_class: string; status: string }> {
  return apiFetch("/behaviour/fingerprint");
}

// ---------------------------------------------------------------------- //
// Forecast

export interface ForecastBlock {
  leadTime: string;
  expectedClass: string;
  probability: number;
  confidence: number;
  status: "nominal" | "watch" | "critical";
  reason: string;
}

export function fetchForecastTimeline(): Promise<{ blocks: ForecastBlock[] }> {
  return apiFetch("/forecast/timeline");
}

export interface AttributionItem {
  feature: string;
  label: string;
  shap_value: number;
  contribution_pct: number;
}

export interface ForecastRunResponse {
  region_id: string;
  fingerprint: Record<string, number | string>;
  forecast: {
    predicted_class: string;
    class_probabilities: Record<string, number>;
    probability_m_or_above: number;
    confidence: number;
    lead_time_minutes: number;
    attribution: AttributionItem[];
  };
  closest_historical_match: { id: string; goes_class: string; similarity_pct: number } | null;
}

export function runForecast(regionId: string): Promise<ForecastRunResponse> {
  return apiFetch(`/forecast/run?region_id=${encodeURIComponent(regionId)}`, { method: "POST" });
}

// ---------------------------------------------------------------------- //
// History / retrieval

export interface HistoricalEventDto {
  id: string;
  date: string;
  goesClass: string;
  peakFlux: string;
  duration: string;
  lag: string;
  similarity: number;
  desc: string;
  dataSource: string;
}

export function fetchHistoryEvents(): Promise<{ events: HistoricalEventDto[] }> {
  return apiFetch("/history/events");
}

export interface HistorySimilarResponse {
  current: { id: string; goes_class: string; peak_flux: string; rise_duration: string; lag: string; curve: number[] };
  match: { id: string; date: string; goes_class: string; peak_flux: string; rise_duration: string; lag: string; curve: number[] };
  similarity_pct: number;
  data_source: string;
}

export function fetchHistorySimilar(): Promise<HistorySimilarResponse> {
  return apiFetch("/history/similar");
}

// ---------------------------------------------------------------------- //
// Explainable AI

export interface ExplainResponse {
  predicted_class: string;
  confidence: number;
  lead_time_minutes: number;
  headline: string;
  attribution: AttributionItem[];
  reasoning: string;
  model_name: string;
  explainability_method: string;
}

export function fetchExplain(): Promise<ExplainResponse> {
  return apiFetch("/explain");
}

// ---------------------------------------------------------------------- //
// Model metrics

export interface MetricGridItem {
  id: string;
  name: string;
  value: number;
  suffix: string;
  decimals: number;
  isTime?: boolean;
}

export function fetchMetrics(): Promise<{ grid: MetricGridItem[]; raw: Record<string, unknown> }> {
  return apiFetch("/metrics");
}

// ---------------------------------------------------------------------- //
// Real-event replay (backend/replay/) — actual downlinked Aditya-L1 data,
// not the live simulator. See calibration_note on the fingerprint: these
// are raw, uncalibrated detector counts, so there's no GOES class here.

export interface RealEventSummary {
  event_id: string;
  peak_counts: number;
  mean_counts: number;
  has_dual_channel: boolean;
}

export function fetchReplayEvents(): Promise<{ events: RealEventSummary[]; note: string }> {
  return apiFetch("/replay/events");
}

export interface ReplayPoint {
  t: number;
  soft: number;
  hard: number | null;
}

export function fetchReplayTelemetry(eventId: string): Promise<{ points: ReplayPoint[]; progress_pct: number; total_samples: number }> {
  return apiFetch(`/replay/telemetry?event=${encodeURIComponent(eventId)}`);
}

export interface RealEventFingerprint {
  event_id: string;
  has_dual_channel: boolean;
  peak_counts: number;
  background_counts: number;
  activity_percentile: number;
  activity_label: "Quiet" | "Elevated" | "Active" | "Extreme";
  sxr_rise_gradient_counts_per_s: number;
  thermal_decay_tau_s: number;
  event_duration_s: number;
  peak_ratio: number | null;
  cross_correlation: number | null;
  hxr_sxr_lag_s: number | null;
  hxr_impulsiveness_counts_per_s: number | null;
  calibration_note: string;
}

export function fetchReplayFingerprint(eventId: string): Promise<RealEventFingerprint> {
  return apiFetch(`/replay/fingerprint?event=${encodeURIComponent(eventId)}`);
}

// ---------------------------------------------------------------------- //
// Sparkline helper (shared by any component rendering `history: number[]`)

export function toSparklinePath(values: number[], width = 64, height = 20): string {
  if (!values || values.length < 2) return `M 0 ${height / 2} L ${width} ${height / 2}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}
