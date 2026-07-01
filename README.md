# APHELION AI — Physics-Informed Solar Flare Forecasting Platform

![APHELION AI](APHELION%20LOGO.png)

APHELION AI (formerly SolarShield AI) is a Space Weather Intelligence Platform developed for the **ISRO Bharatiya Antariksh Hackathon**. 

Rather than treating solar flare forecasting as a standard black-box machine learning classification problem (e.g., generic LSTMs), APHELION AI introduces the **Solar Behaviour Engine (SBE)**. This architecture parses raw telemetry, extracts physics-based behavioural descriptors, and uses **Case-Based Reasoning** to retrieve analogous historical events, providing human-readable, physics-informed explainability for mission operators.

---

## 🚀 Key Innovations

- **Solar Behaviour Engine (SBE)**: Computes physical descriptors (Hard-to-Soft Lag, Rise Velocity, Peak Ratios) directly from telemetry arrays instead of feeding raw flux into ML models.
- **Historical Behaviour Retrieval**: Instead of opaque probability scores (e.g., "75% chance of X-Class"), APHELION retrieves the closest historical matches via KDTree (e.g., "Current telemetry is 92% similar to the SOL2023 event").
- **Strict Data Pipeline**: Robust FITS parsing preserving `float64` scientific precision.
- **Mission Control UI**: A premium, "dark-first" Next.js dashboard inspired by NASA and ISRO mission control rooms, communicating data density and operational readiness.

---

## 🏗 Architecture

The platform is strictly divided into a highly performant Python data backend and a modern React frontend.

```
APHELION ISRO/
├── backend/                  # Scientific Python Data Pipeline
│   ├── loaders/              # FITS parsing and telemetry extraction
│   ├── validation/           # ScientificValidationEngine (Headers & Quality)
│   ├── preprocessing/        # TelemetrySynchronizer (pandas.merge_asof)
│   ├── event_detection/      # Scipy-based flare segmenter
│   ├── behaviour/            # Solar Behaviour Engine (7D Fingerprints)
│   ├── retrieval/            # KDTree Historical Matcher
│   └── forecast/             # XGBoost Predictive Engine
│
└── dashboard/                # Next.js Frontend App
    ├── src/app/              # App Router (/, /dashboard, /forecast, etc.)
    └── src/components/       # Recharts, Shadcn UI, Framer Motion
```

---

## ⚙️ Local Development

### 1. Python Backend (Data Engineering)
Ensure you have Python 3.12+ installed.
```bash
# Navigate to project root
cd "APHELION ISRO"

# Activate the virtual environment
source backend/venv/bin/activate

# (Optional) Install dependencies if running for the first time
pip install -r backend/requirements.txt

# Execute Phase 2 Extraction & Synchronization test
export PYTHONPATH=$(pwd)/backend
python backend/run_phase2.py
```

### 2. Next.js Frontend (Mission Control Dashboard)
Ensure you have Node.js 18+ installed.
```bash
# Navigate to the dashboard directory
cd dashboard

# Install node dependencies
npm install

# Run the development server
npm run dev
```
Navigate to `http://localhost:3000` to view the application.

---

## 🛰 Data Sources

This platform is engineered to process Level-1 telemetry from **ISRO's Aditya-L1** observatory:
1. **SoLEXS** (Solar Low Energy X-ray Spectrometer): `.lc.gz` and `.pi.gz`
2. **HEL1OS** (High Energy L1 Orbiting X-ray Spectrometer): `.fits` lightcurves

*Note: Raw scientific datasets must be placed in `backend/data/raw/` (or the project root) but are explicitly `.gitignore`'d to preserve repository performance.*
