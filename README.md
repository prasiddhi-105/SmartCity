# 🌆 Civora AI-Powered Smart Urban Safety & Emergency Response Platform

> **Hackathon Submission** | IIT Delhi × TigerGraph  
> A real-time, graph-powered urban-safety platform for Chandigarh that combines AI inference, live CCTV crowd analysis, incident NLP, and multi-role dashboards.

---

## 🚀 Project Overview

**SmartCity** is an end-to-end intelligent safety system that empowers citizens, patrol officers, and supervisors with actionable, AI-generated insights about city-safety in real time. It integrates a **TigerGraph knowledge graph** (UrbanSafetyGraph) of the Chandigarh road network with three independent AI pipelines — LSTM time-series danger prediction, computer-vision crowd analysis, and NLP incident classification — all served through a FastAPI backend and a React/Vite frontend.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🗺️ **Live Danger Heatmap** | Per-intersection danger scores overlaid on the Chandigarh map, fetched from TigerGraph |
| 🛤️ **Safe Route Planner** | Dijkstra-based safest-path computation over the graph with live risk weights |
| 📡 **CCTV Crowd Analysis** | MobileNetV2 + YOLOv8 inference on uploaded frames to estimate crowd density & detect anomalies |
| 🔮 **LSTM Danger Predictor** | Temporal LSTM model (`lstm_INT007.keras`) predicts danger scores per zone (MC-Dropout uncertainty bounds) |
| 📝 **NLP Incident Reports** | Transformer-based sentiment/emotion/severity pipeline; fast keyword path returns enriched results in < 5 ms |
| 🚨 **SOS Dispatch** | Citizens can trigger SOS; supervisors see live alerts with AI-generated classification |
| 👮 **Role-Based Access (RBAC)** | Three roles: Citizen, Patrol Officer, Supervisor — each with a custom portal |
| 📊 **Supervisor Dashboard** | Real-time incident feed, analytics, cluster overview, officer tracking |
| 🏙️ **Cluster Info** | Zone-level statistical summary pulled from the graph |
| 🔍 **Graph Explorer** | Interactive node/edge explorer for the UrbanSafetyGraph |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React / Vite Frontend                    │
│  (Leaflet maps · Recharts analytics · Role portals)             │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP  /api/v1/*
┌────────────────────────▼────────────────────────────────────────┐
│               FastAPI Backend  (backend_python/)                │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  LSTM Router │  │  CV Router   │  │  NLP / Reports Router  │ │
│  │ (danger.py) │  │  (cctv.py)   │  │   (reports.py)         │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬─────────────┘ │
│         │                │                      │               │
│  ┌──────▼──────────────────────────────────────▼──────────────┐ │
│  │              AI Model Layer  (ai/)                         │ │
│  │   lstm/lstm_INT007.keras  ·  cv/mobilenetv2_crowd.pth     │ │
│  │   cv/yolov8n.pt           ·  nlp/inference.py             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │       Graph / Data Routers                               │  │
│  │  safe_route · intersections · incidents · cluster_info   │  │
│  │  graph (heatmap) · danger_score · portal_routes          │  │
│  └─────────────────────┬────────────────────────────────────┘  │
│                        │                                        │
│  ┌─────────────────────▼────────────────────────────────────┐  │
│  │        custom_db/tigergraph_client.py                    │  │
│  │        pyTigerGraph  →  TigerGraph Cloud                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│          TigerGraph Cloud  —  UrbanSafetyGraph                  │
│  Intersection vertices · Road-segment edges · Safety attributes │
│  (Chandigarh road network  ≈ 400 vertices, 2 300+ edges)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ TigerGraph — UrbanSafetyGraph

**Graph name:** `UrbanSafetyGraph`  
**Host:** TigerGraph Cloud (accessed via JWT Bearer token; DNS-patch applied for institutional network)

### Vertex Types

| Type | Key attributes |
|---|---|
| `Intersection` | `intersection_id`, `intersection_name`, `latitude`, `longitude` |

### Edge Types

| Type | Description |
|---|---|
| `RoadSegment` (directed) | Connects intersections; carries `distance_km`, `risk_score`, `lighting_score` |

### Data

- **Source:** Custom-scraped Chandigarh road-network JSON (`data/chandigarh_vertices.json`, `data/chandigarh_edges.json`)
- **Loader:** `data/load_to_tg.py` — batched REST++ upsert with retry logic and DNS bypass
- **Batch sizes:** 200 vertices / 300 edges per request

---

## 📂 Repository Structure

```
SmartCity/
├── ai/                          # AI model files & inference code
│   ├── lstm/
│   │   ├── lstm_INT007.keras    # Trained LSTM danger-score model
│   │   ├── scaler_INT007.pkl    # Feature scaler for LSTM
│   │   └── inference.py
│   ├── cv/
│   │   ├── mobilenetv2_crowd.pth  # MobileNetV2 crowd density classifier
│   │   ├── inference.py           # YOLOv8 + MobileNetV2 pipeline
│   │   └── app.py
│   └── nlp/
│       ├── inference.py           # Transformer NLP pipeline (>50 KB)
│       └── app.py
│
├── backend_python/              # FastAPI application
│   ├── main.py                  # App entry point, router registration, lifespan
│   ├── config.py                # All env-vars & feature-flags in one place
│   ├── requirements.txt
│   ├── routers/                 # One file per API feature
│   │   ├── danger.py            # POST /api/v1/danger/score  (LSTM+CV+anomaly)
│   │   ├── cctv.py              # POST /api/v1/cctv/analyze
│   │   ├── reports.py           # GET/POST /api/v1/reports + NLP analysis
│   │   ├── safe_route.py        # GET /api/v1/safe-route
│   │   ├── intersections.py     # GET /api/v1/intersections
│   │   ├── incidents.py         # GET /api/v1/incidents
│   │   ├── graph.py             # GET /api/v1/graph/{heatmap,intersections,status}
│   │   ├── auth.py              # POST /api/v1/auth/signup & /login
│   │   ├── citizen.py           # Citizen-role endpoints
│   │   ├── supervisor.py        # Supervisor-role endpoints
│   │   ├── officer.py           # Patrol-officer endpoints
│   │   ├── portal_routes.py     # Dual-route, SOS, admin stats
│   │   └── ...
│   ├── custom_db/
│   │   ├── tigergraph_client.py # Singleton TigerGraph connection wrapper
│   │   └── mock_db.py           # In-memory fallback when TG is unavailable
│   ├── services/                # Business-logic layer (NLP, danger aggregation)
│   └── middleware/
│
├── src/                         # React / Vite frontend
│   ├── pages/
│   │   ├── Login.jsx & Signup.jsx
│   │   ├── SupervisorDashboard.jsx   # Live incident feed + analytics
│   │   ├── CitizenDashboard.jsx
│   │   ├── OfficerDashboard.jsx
│   │   └── PublicCitizenPortal.jsx   # Map, safe-route, SOS, report form
│   ├── components/
│   │   ├── Dashboard.jsx        # Main map + heatmap overlay
│   │   ├── SafeRoutePanel.jsx
│   │   ├── DangerPanel.jsx
│   │   ├── CCTVPanel.jsx
│   │   ├── IncidentsPanel.jsx
│   │   ├── AnomalyScanner.jsx
│   │   ├── ClusterPanel.jsx
│   │   ├── Explorer.jsx         # Graph explorer
│   │   ├── ReportForm.jsx
│   │   ├── AdminPortal.jsx
│   │   └── ...
│   └── api/                     # Axios wrappers for backend calls
│
├── data/                        # Graph seed data & loaders
│   ├── chandigarh_vertices.json # ~400 intersection vertices
│   ├── chandigarh_edges.json    # ~2 300 road-segment edges
│   ├── chandigarh_graph_data.json
│   └── load_to_tg.py            # Bulk loader (REST++ upsert, DNS patch)
│
├── start_backend.py             # One-command backend launcher
├── index.html
├── vite.config.js
└── package.json
```

---

## 🤖 AI Pipelines

### 1. LSTM Danger Predictor
- **Model:** Custom LSTM trained on intersection-level temporal features (`lstm_INT007.keras`)
- **Input:** 24-step time-series of [hour, day, crimes, incidents, crowd_density, lighting]
- **Output:** `danger_score` ∈ [0,1] with MC-Dropout uncertainty bounds
- **Aggregation weights:** LSTM 45% · CV 30% · Anomaly 15% · Graph 10%

### 2. Computer Vision (CCTV Analysis)
- **MobileNetV2** — crowd density classification (Low / Medium / High)
- **YOLOv8n** — person count + anomaly detection (weapons, suspicious objects)
- Accepts JPEG/PNG uploads or Base-64 encoded frames

### 3. NLP Incident Classifier
- **Fast path (< 5 ms):** Keyword-based emergency detection → instant response
- **Full ML path (background):** Transformer-based sentiment, emotion (7 classes), entity extraction, credibility scoring, deduplication
- Output fields: `severity`, `emergency_level`, `distress_level`, `recommended_actions`, `auto_response`

---

## 👥 User Roles

| Role | Login | Access |
|---|---|---|
| **Citizen** | Email + Password | Report incident, request safe route, SOS |
| **Patrol Officer** | Officer credential | Live patrol map, accept assignments |
| **Supervisor** | Supervisor access key | Full dashboard, analytics, incident management |

---

## 🛠️ Running Locally

### Prerequisites
- Python ≥ 3.10
- Node.js ≥ 18
- TigerGraph Cloud account (or set `USE_MOCK_DB=true` in `config.py`)

### Backend

```bash
# From project root
cd backend_python
pip install -r requirements.txt

# Start the FastAPI server
python main.py
# → runs at http://localhost:8000
# → API docs at http://localhost:8000/docs
```

Or use the convenience launcher:
```bash
python start_backend.py
```

### Frontend

```bash
# From project root
npm install
npm run dev
# → runs at http://localhost:5173
```

### Loading Graph Data

```bash
cd data
python load_to_tg.py
```

> **Note:** The loader patches Python's DNS resolver to bypass institutional DNS restrictions that block TigerGraph Cloud hostnames.

---

## 🔑 Environment / Configuration

All settings live in `backend_python/config.py`. Key variables:

| Variable | Default | Description |
|---|---|---|
| `TG_HOST` | TG Cloud URL | TigerGraph host |
| `TG_GRAPHNAME` | `UrbanSafetyGraph` | Target graph |
| `TG_TOKEN` | JWT bearer | Auth token |
| `USE_MOCK_DB` | `false` | Use in-memory mock instead of TG |
| `ENABLE_CV` | `true` | Enable CV inference |
| `ENABLE_NLP` | `true` | Enable NLP inference |
| `ENABLE_LSTM` | `true` | Enable LSTM inference |
| `W_LSTM / W_CV / W_ANOMALY / W_GRAPH` | 0.45 / 0.30 / 0.15 / 0.10 | Danger aggregation weights |

---

## 🔌 API Reference (summary)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health + model status |
| `POST` | `/api/v1/danger/score` | LSTM+CV+Anomaly aggregated danger score |
| `GET` | `/api/v1/danger-score` | Per-intersection danger scores (TG-backed) |
| `GET` | `/api/v1/graph/heatmap` | Heatmap data from TigerGraph |
| `GET` | `/api/v1/intersections` | All intersection vertices |
| `GET` | `/api/v1/incidents` | Incident list |
| `POST` | `/api/v1/cctv/analyze` | CCTV frame crowd + anomaly analysis |
| `GET/POST` | `/api/v1/reports` | List / submit + NLP-analyze incident reports |
| `GET` | `/api/v1/safe-route` | Safe route between two intersections |
| `GET` | `/api/v1/cluster-info` | Zone cluster statistics |
| `POST` | `/api/v1/auth/signup` | User registration |
| `POST` | `/api/v1/auth/login` | JWT login (citizen / officer / supervisor) |
| `POST` | `/api/v1/user/sos` | SOS alert dispatch |
| `GET` | `/api/v1/admin/stats` | Admin / supervisor analytics |

Full interactive docs: `http://localhost:8000/docs`

---

## 🧩 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Leaflet/React-Leaflet, Recharts, TailwindCSS |
| **Backend** | FastAPI 0.115, Uvicorn, Pydantic v2, python-jose (JWT) |
| **Graph DB** | TigerGraph Cloud — `UrbanSafetyGraph`, pyTigerGraph 1.6 |
| **AI — LSTM** | TensorFlow / Keras, scikit-learn (scaler), NumPy |
| **AI — CV** | PyTorch, MobileNetV2, Ultralytics YOLOv8, Pillow |
| **AI — NLP** | HuggingFace Transformers, scikit-learn, SciPy |
| **Maps** | OpenStreetMap tiles via Leaflet |

## 🧩 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | ![React](https://img.shields.io/badge/React_19-%2320232a.svg?style=flat-square&logo=react&logoColor=%2361DAFB) ![Vite](https://img.shields.io/badge/Vite_8-%23646CFF.svg?style=flat-square&logo=vite&logoColor=white) ![Leaflet](https://img.shields.io/badge/Leaflet-%23B9E12B.svg?style=flat-square&logo=leaflet&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-%2338B2AC.svg?style=flat-square&logo=tailwind-css&logoColor=white) <br> ![Recharts](https://img.shields.io/badge/Recharts-%2322B5BF.svg?style=flat-square) |
| **Backend** | ![FastAPI](https://img.shields.io/badge/FastAPI_0.115-%23009688.svg?style=flat-square&logo=FastAPI&logoColor=white) <br> ![Pydantic](https://img.shields.io/badge/Pydantic_v2-%23E92063.svg?style=flat-square&logo=pydantic&logoColor=white) <br> `python-jose (JWT)` <br> ![Uvicorn](https://img.shields.io/badge/Uvicorn-%23444444.svg?style=flat-square) |
| **Graph DB** | ![TigerGraph](https://img.shields.io/badge/TigerGraph_Cloud-%23FF6B00.svg?style=flat-square) -`UrbanSafetyGraph` <br> ![pyTigerGraph](https://img.shields.io/badge/pyTigerGraph_1.6-%23FF6B00.svg?style=flat-square&logo=python&logoColor=white) |
| **AI — LSTM** | ![TensorFlow](https://img.shields.io/badge/TensorFlow-%23FF6F00.svg?style=flat-square&logo=TensorFlow&logoColor=white) ![Keras](https://img.shields.io/badge/Keras-%23D00000.svg?style=flat-square&logo=Keras&logoColor=white) ![scikit-learn](https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=flat-square&logo=scikit-learn&logoColor=white) ![NumPy](https://img.shields.io/badge/NumPy-%23013243.svg?style=flat-square&logo=NumPy&logoColor=white) |
| **AI — CV** | ![PyTorch](https://img.shields.io/badge/PyTorch-%23EE4C2C.svg?style=flat-square&logo=PyTorch&logoColor=white) ![YOLOv8](https://img.shields.io/badge/YOLOv8-%23002F6C.svg?style=flat-square) <br> ![MobileNetV2](https://img.shields.io/badge/MobileNetV2-%234285F4.svg?style=flat-square) ![Pillow](https://img.shields.io/badge/Pillow-%23121212.svg?style=flat-square) |
| **AI — NLP** | ![HuggingFace](https://img.shields.io/badge/%F0%9F%A4%97_HuggingFace-%23FFD21E.svg?style=flat-square) <br> ![scikit-learn](https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=flat-square&logo=scikit-learn&logoColor=white) `(scaler)` <br> ![SciPy](https://img.shields.io/badge/SciPy-%238CAAE6.svg?style=flat-square&logo=SciPy&logoColor=white) |
| **Maps** | ![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-%237EBC6F.svg?style=flat-square&logo=OpenStreetMap&logoColor=white) `tiles via Leaflet` |
---

## 📜 License

MIT — feel free to fork and build on top of this for your own city-safety use case.
