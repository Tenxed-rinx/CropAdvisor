# Crop Advisor 🌾

> **"Know your soil. Choose the right crop."**

Crop Advisor is a modern, responsive web application for precision agriculture and agronomic decision-making. It connects virtual IoT soil sensors, comprehensive soil health profiling, real-time crop suitability ranking, and a big data analytics lab.

---

## 🌟 Key Features

1. **Virtual Sensor Board & Live Telemetry (`/simulator`)**:
   - Interactive SVG schematic of an Arduino UNO with real-time wiring to sensors:
     - Soil Moisture Probe (Pin A0)
     - DHT22 Temperature & Humidity (Pin D2)
     - 5V Relay & Submersible Pump (Pin D7)
     - Water Tank Depth Sensor (Pin A2)
     - LDR Sunlight Sensor (Pin A1)
     - Soil pH Electrochemical Sensor (Pin A3)
   - Component Inspector: click any component to inspect its scientific working principle, operating limits, live readings, and pin connections.
   - Live serial telemetry monitor and hysteresis-based pump automation.

2. **Soil Health Analysis & Regional Profiling (`/analysis`)**:
   - Sourced from live telemetry, historical datasets, Kaggle benchmark soil profiles (Alluvial Loam, Black Cotton, Red Laterite, Arid Sandy), or custom manual entry.
   - Comprehensive soil assessment: pH, moisture %, N-P-K nutrient status, electrical conductivity (EC), and USDA soil texture classification.
   - Visual radar breakdown and benchmark comparison against Indo-Gangetic regional baselines.

3. **Prescriptive Crop Suitability & Profit Optimization (`/crop-advice`)**:
   - Multi-criteria decision engine evaluating Indian crops against your active soil profile, seasonal windows (Kharif, Rabi, Zaid), and mandi pricing trends.
   - Real-time reactivity: changing soil parameters dynamically recalculates crop rankings, suitability scores, and projected profits per acre.
   - Interactive farm budget and land size modeling with customizable scoring weights.

4. **Data Lab & Pipeline Analytics (`/datalab`)**:
   - 4-step pipeline explanation: Data Ingestion → Cleansing (IQR 1.5×) → Soil Profiling → Prescriptive Advice.
   - Live 5 Vs of Big Data (Volume, Velocity, Variety, Veracity, Value).
   - Data Quality Audit table with outlier detection and median imputation preview.
   - Pairwise Pearson Correlation Matrix ($r$) with practical agronomic interpretations.

---

## 🚀 Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Visualization**: Recharts (Radar, Bar, Line charts) + SVG Interactive Circuit Diagram
- **Data Parsing**: Papa Parse (CSV)
- **Icons**: Lucide React
- **Routing**: React Router v7
- **Persistence**: LocalStorage with fail-safe fallbacks (100% client-side, no backend or API keys required)

---

## 💻 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
```
The production bundle will be created in the `dist/` directory.

---

## 📦 How to Push to GitHub

1. **Initialize Git & Commit** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Crop Advisor"
   git branch -M main
   ```

2. **Create a new repository on GitHub**:
   - Go to [github.com/new](https://github.com/new).
   - Name your repository (e.g. `crop-advisor`).
   - Leave "Initialize this repository with a README" **unchecked**.
   - Click **Create repository**.

3. **Link your local repo and push**:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/crop-advisor.git
   git push -u origin main
   ```

---

## 🚀 How to Deploy on Vercel

### Method A: Via Vercel Web Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and log in (or sign up with your GitHub account).
2. Click **"Add New..."** → **"Project"**.
3. Select your GitHub repository (`crop-advisor`) and click **"Import"**.
4. Configure the Project Settings (Vercel auto-detects Vite):
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Click **"Deploy"**.
6. Within ~60 seconds, your application will be live at `https://crop-advisor-<your-username>.vercel.app`!

> **Note on Client-Side Routing**: A `vercel.json` file is already included in the root directory to handle SPA rewrites (`/(.*) -> /index.html`), ensuring deep links and browser refreshes work seamlessly.

### Method B: Via Vercel CLI

```bash
# Install Vercel CLI globally (optional)
npm i -g vercel

# Deploy directly from terminal
vercel
```
Follow the interactive prompts, select default settings, and deployment completes automatically.

---

## 📄 License
Apache-2.0
