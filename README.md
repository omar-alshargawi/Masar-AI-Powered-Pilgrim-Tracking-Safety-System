# 🕌 Masar — AI-Powered Pilgrim Tracking & Safety System

> **Real-time anomaly detection for Hajj campaign supervisors**  
> University of Jeddah · Department of CS & AI · Senior Project 2025/2026



---

<img width="872" height="506" alt="photo_2026-05-20_16-39-11" src="https://github.com/user-attachments/assets/424deeea-51b5-4062-b0ff-1f489259b399" />


---

## 📌 Table of Contents

- [Overview](#-overview)
- [The Problem](#-the-problem)
- [Our Solution](#-our-solution)
- [System Architecture](#-system-architecture)
- [AI Models](#-ai-models)
- [Results](#-results)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Screenshots](#-screenshots)
- [Team](#-team)

---

## 🌍 Overview

**Masar** (مسار — Arabic for *path* or *route*) is a lightweight, AI-driven pilgrim tracking and safety system built for Hajj campaign supervisors.

During Hajj, a single supervisor may be responsible for 30–200 pilgrims moving through some of the world's densest crowds. Current supervision relies on manual roll calls, WhatsApp chats, and phone calls — methods that are slow, error-prone, and ineffective at scale.

Masar replaces guesswork with real-time AI. By analyzing GPS movement sequences, it automatically classifies each pilgrim's behavior as **Normal** or **Abnormal** — alerting supervisors before a separation becomes a crisis.

---

## 🚨 The Problem

| What supervisors use today | What goes wrong |
|---|---|
| Paper checklists & roll calls | Pilgrims separate in dense crowds |
| WhatsApp group chats | Foreign pilgrims face language barriers |
| Phone calls when someone is missed | Delays detected only *after* the fact |
| Informal head counts every few minutes | Existing smart systems are too costly or infrastructure-heavy |

> A single GPS point cannot tell you if a pilgrim is returning to the group or drifting further away. **Movement must be understood as a sequence, not a snapshot.**

---

## 💡 Our Solution

Masar frames supervision as a **streaming sequence-classification problem**:

1. 📡 **Collect** — Pilgrim smartphones stream GPS readings to the backend
2. ⚙️ **Extract** — 5 engineered movement features computed per reading
3. 🧠 **Classify** — A sequence model (window of 10 timesteps) predicts Normal or Abnormal
4. 🔔 **Alert** — Supervisor dashboard updates in real time (<200ms end-to-end)

### The Dynamic Geofence

Unlike traditional fixed-radius geofences, Masar anchors the fence on the **supervisor's own live GPS position**. As the group walks, the fence walks with them.

<img width="1024" height="571" alt="baa99aea-c3dd-4319-8358-0371f7f48271" src="https://github.com/user-attachments/assets/432687e8-6c0a-4f84-b277-feefea515c09" />


---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 18)                     │
│   Pilgrim PWA  ·  Supervisor Dashboard  ·  Admin Console   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP / WebSocket
┌───────────────────────▼─────────────────────────────────────┐
│              BACKEND (FastAPI + SQLite)                     │
│  Auth · Campaign CRUD · GPS Ingest · WebSocket Fan-out     │
│  Append-only audit trail · 30s alert cooldown              │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              AI INFERENCE (PyTorch)                         │
│  Per-pilgrim feature deque (capacity 10)                   │
│  LSTM / Transformer / RNN forward pass                     │
│  Binary label returned in <200ms                           │
└─────────────────────────────────────────────────────────────┘
```

**Three user roles:**
- **Admin** — manages campaigns, users, and supervisor-pilgrim assignments
- **Supervisor** — monitors live pilgrim map, alerts, and per-pilgrim status
- **Pilgrim** — lightweight mobile PWA that streams GPS and shows status + SOS button

---

## 🧠 AI Models

### Feature Engineering

Raw GPS coordinates are transformed into 5 movement features per timestep:

| Feature | Description |
|---|---|
| **Speed** (v) | Instantaneous velocity in m/s |
| **Distance delta** (Δd) | Great-circle distance between consecutive points (haversine) |
| **Direction change** (Δθ) | Signed bearing difference, normalized to (−180°, 180°] |
| **Time gap** (Δt) | Time between consecutive readings (with ε floor) |
| **Distance to supervisor** (dₛ) | Haversine distance from pilgrim to supervisor's live position |

### Model Comparison (SP2)

All three models share an identical classifier head and training recipe. Only the temporal core changes.

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| **LSTM** | 0.967 | **0.942** | 0.927 | **0.934** | 0.989 |
| **Transformer** | 0.966 | 0.919 | **0.945** | 0.932 | **0.992** |
| **RNN** | 0.966 | 0.924 | 0.939 | 0.932 | 0.990 |
| Baseline (dist < 10m) | 0.963 | 0.916 | 0.940 | 0.928 | 0.985 |

> Evaluated on a **route-disjoint test split** — the test set contains routes never seen during training.

<img width="1017" height="553" alt="photo_2026-05-20_16-39-21" src="https://github.com/user-attachments/assets/cd3075b4-3e1e-4035-beec-8101848c5e14" />


### Training Curves

<img width="1017" height="382" alt="photo_2026-05-20_16-39-29" src="https://github.com/user-attachments/assets/40c30020-586d-43cf-991c-acee1157f2df" />

### Why Transformer for deployment?
In a safety-critical system, **missing an abnormal case is worse than a false alarm**. The Transformer achieved the highest recall (0.945) and lowest false negatives (190 vs. LSTM's 255), making it the safer production choice.

---

## 📊 Results

```
Transformer Model — Route-Disjoint Test Set
─────────────────────────────────────────────
Accuracy          →  96.6%
Recall            →  94.5%   ← Most important for safety
Precision         →  91.9%
F1-Score          →  93.2%
ROC-AUC           →  99.2%   ← Highest among all models
False Negatives   →  190     ← Lowest (fewest missed anomalies)
End-to-end latency → <200ms on CPU-only hardware
```

---

## ✨ Features

- 🗺️ **Live pilgrim map** — real-time location visualization with Leaflet
- 🤖 **AI anomaly detection** — sequence-based, not just distance-based
- 📍 **Dynamic geofence** — anchored on supervisor's live GPS, not a fixed point
- 🔔 **Instant alerts** — WebSocket fan-out to all connected clients in <200ms
- 🆘 **SOS button** — one-tap emergency request from pilgrim interface
- 🔐 **Role-based auth** — Admin / Supervisor / Pilgrim with bcrypt hashing
- 📋 **Audit trail** — every GPS reading and alert is append-only and reconstructible
- ⚡ **30s alert cooldown** — prevents duplicate alerts from GPS noise spikes
- 🔢 **Numeric IDs** — designed for elderly pilgrims and foreign-language groups
- ☁️ **No required cloud** — SQLite on-disk keeps data in operator's custody

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, react-leaflet, Tailwind CSS |
| **Backend** | FastAPI, SQLAlchemy (async), SQLite, WebSockets |
| **AI / ML** | PyTorch, scikit-learn, NumPy, pandas |
| **Auth** | bcrypt, JWT |
| **Maps** | Leaflet / Google Maps API |
| **Deployment** | CPU-only compatible, Raspberry Pi 4 capable |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/masar.git
cd masar
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. AI model setup
```bash
cd ai
pip install -r requirements.txt
python train.py          # Train all three models
python inference.py      # Start the inference service
```

### 4. Frontend setup
```bash
cd frontend
npm install
npm run dev
```

### 5. Open the app
```
http://localhost:5173
```

---

## 📁 Project Structure

```
masar/
├── backend/                  # FastAPI backend
│   ├── main.py
│   ├── models.py
│   ├── websocket_manager.py
│   └── requirements.txt
│
├── ai/                       # AI inference layer
│   ├── train.py
│   ├── inference.py
│   ├── features.py
│   ├── models/               # Saved checkpoints + scaler
│   └── data/                 # Synthetic GPS dataset
│
├── frontend/                 # React 18 frontend
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── hooks/
│   └── package.json
│
└── docs/
    └── images/               # All README images go here
```

---

## 📸 Screenshots

### Landing Page
<img width="872" height="506" alt="photo_2026-05-20_16-39-11" src="https://github.com/user-attachments/assets/2daff6da-7b8a-4c8b-8310-c9f093610141" />


---

### Sign In — Role-Based Access
<img width="655" height="689" alt="photo_2026-05-20_16-39-38" src="https://github.com/user-attachments/assets/a6ffb834-f16b-4a2c-a650-da0d1ee7897e" />

---

### Supervisor Dashboard
<img width="714" height="1280" alt="photo_2026-05-20_16-39-24" src="https://github.com/user-attachments/assets/86a6e4f6-85f5-40aa-bc4a-f9920e9c3572" />

---

### Pilgrim Mobile Interface
<img width="1280" height="579" alt="photo_2026-05-20_16-39-40" src="https://github.com/user-attachments/assets/91716170-bb19-42c2-b295-fb1e98b12a8e" />

---

### Admin Console
<img width="714" height="1280" alt="photo_2026-05-20_16-39-33" src="https://github.com/user-attachments/assets/a674d270-692e-4ad5-9520-ffa4840ef703" />

---

## 👨‍💻 Team

| Name | Role |
|---|---|
| **Faisal Almars** | AI pipeline, system architecture |
| **Abdulrahman Alsumairi** | AI inference backend |
| **Safwan Alimam** | Supervisor dashboard, anomaly validation |
| **Abdulaziz Etaiwi** | GPS inference backend, data engineering |
| **Omar AlSharqawi** | Frontend, multi-user testing |

**Supervisor:** Dr. Anas Saleh A. Alkarim  
**Institution:** University of Jeddah — Department of CS & AI



---

## 🤝 Acknowledgements

- Department of CS & AI, University of Jeddah
- Dr. Anas Alkarim for project supervision
- Saudi Vision 2030 Smart Pilgrimage initiative

---

<p align="center">
  Made with ❤️ for safer Hajj — University of Jeddah 2025/2026
</p>
