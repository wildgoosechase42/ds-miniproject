# SomaiyaSat Flight Computing Engine & Ground Control

[![Vercel Deployment](https://img.shields.io/badge/Vercel-ds--miniproject.vercel.app-black?logo=vercel)](https://ds-miniproject.vercel.app/)
[![Render Backend](https://img.shields.io/badge/Render-somaiyasat--backend-46e3b7?logo=render)](https://somaiyasat-backend.onrender.com/docs)
[![Next.js](https://img.shields.io/badge/Next.js-16.3.6-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_ctypes-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![C](https://img.shields.io/badge/C-libmissionsuite.so-A8B9CC?logo=c)](https://en.wikipedia.org/wiki/C_(programming_language))
[![Three.js](https://img.shields.io/badge/Three.js-Orbital_3D-000000?logo=threedotjs)](https://threejs.org/)
[![License: Academic](https://img.shields.io/badge/License-Academic_Use-blue.svg)](#)

A high-performance in-memory orbital telemetry computing engine and interactive data structures laboratory built for **SomaiyaSat & SomaiyaPod** (PocketQube Mission KJS-SRS-01).

- 🌐 **Live Web Application (Vercel):** [https://ds-miniproject.vercel.app](https://ds-miniproject.vercel.app)
- 🛰️ **Live Backend API (Render):** [https://somaiyasat-backend.onrender.com](https://somaiyasat-backend.onrender.com)
- 📖 **Interactive Swagger API Docs:** [https://somaiyasat-backend.onrender.com/docs](https://somaiyasat-backend.onrender.com/docs)

---

## Academic Context

- **Course:** Data Structures (DS) Mini Project · S.Y. B.Tech Information Technology
- **Institution:** K J Somaiya School of Engineering, Somaiya Vidyavihar University, Mumbai
- **Use Case:** KJS-SRS-01 — *SomaiyaSat & SomaiyaPod: A PocketQube Mission featuring Autonomous AI-Based Inter-Satellite Data Routing and Advanced Multi-Mode Amateur Radio Payloads (M17, Codec2, SSTV & TT&C / Housekeeping)*
- **Vertical:** Space Technology and Remote Sensing
- **Collaborating Organization:** ReOrbit, Finland
- **Beneficiaries:** Global Amateur Radio (HAM) Community

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│          Next.js 16 Web Application (Vercel Cloud)         │
│   • Three.js 3D Orbital Shells & GSAP Scroll Interactions    │
│   • Interactive Visualizers for 8 Spacecraft Data Structures│
│   • Aerospace Telemetry Dock & Responsive Flight Console    │
│   • Serverless SatNOGS Edge Handlers with Graceful Fallback │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON via REST HTTP
┌──────────────────────────────▼──────────────────────────────┐
│           FastAPI Backend (Render Cloud Platform)           │
│   • Asynchronous Telemetry Orchestration & Slicing          │
│   • Python ctypes C Foreign Function Interface (FFI)        │
│   • Live SatNOGS Satellite Database Telemetry Ingestion     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Direct Memory FFI
┌──────────────────────────────▼──────────────────────────────┐
│           Pure C Shared Core (libmissionsuite.so)           │
│   • Zero-overhead, deterministic spacecraft algorithms      │
│   • In-memory Array, Linked List, Stack, Circular Queue,    │
│     Binary Search Tree, Graph BFS, QuickSort & Hash Table   │
└─────────────────────────────────────────────────────────────┘
```

---

## 8 Flight Computing Experiments

| Experiment | Data Structure | Spacecraft Subsystem | Operational Principle |
|---|---|---|---|
| **01 · Telemetry Array** | Contiguous Array | Static Telemetry Buffer | Fast $O(1)$ indexed access for fixed-capacity sensor packets. |
| **02 · Dynamic Buffer** | Singly Linked List | Burst Telemetry Ingestion | Dynamic node allocation accommodating unpredictable orbital telemetry bursts without fixed capacity constraints. |
| **03 · Task Stack** | Stack (LIFO) | Critical Interrupt Controller | Pushes preempted spacecraft tasks when urgent anomalies or housekeeping routines trigger, popping to resume upon resolution. |
| **04 · Circular Ring** | Circular Queue | Streaming Telemetry Buffer | FIFO telemetry ring with overwrite protection for continuous sensor sampling during downlink blackout periods. |
| **05 · Timeline BST** | Binary Search Tree | Time-Series Query Engine | Chronologically ordered sensor packet storage enabling logarithmic $O(\log n)$ timestamp search and range scans. |
| **06 · Route BFS** | Directed Graph | Intersatellite Mesh Routing | Breadth-First Search (BFS) computing the minimum-hop routing path through satellite relay nodes to ground stations. |
| **07 · Search Engine** | QuickSort & Binary Search | Downlink Priority Sorter | In-place partition sorting ordering packets by criticality (Emergency TT&C > Voice > Imagery) for ground downlink. |
| **08 · Direct Indexer** | Hash Table | Fast Sensor Lookup | Direct hash indexing mapping sensor identifiers to telemetry readings in instantaneous $O(1)$ time with linear probing collision handling. |

---

## Tech Stack

- **Core Flight Engine:** Pure C (`backend/c_core/mission_suite.c`), compiled as a shared library (`libmissionsuite.so`).
- **Backend API:** Python 3.11/3.12, FastAPI, Uvicorn, Python `ctypes`, Render cloud platform.
- **Frontend Framework:** Next.js 16 (App Router), React 19, TypeScript, Vercel edge deployment.
- **Styling & Design System:** Tailwind CSS, JetBrains Mono & Space Grotesk typography, glassmorphism aerospace theme.
- **3D & Animation:** Three.js, React Three Fiber, GSAP ScrollTrigger, Lenis smooth scrolling.
- **Data Source:** SatNOGS Open Satellite Network Telemetry API with automatic offline resilience.

---

## Getting Started Locally

### Prerequisites

- **Node.js:** v18.18 or higher (v20+ recommended)
- **Python:** v3.10 or higher
- **GCC / Clang:** For compiling the C shared library

---

### Quick Start (One Command)

To build the C core and launch both the FastAPI backend and Next.js frontend together:

```bash
npm run dev:all
# or: ./start.sh
```

- Open **[http://localhost:3000](http://localhost:3000)** for the interactive mission console.
- Open **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)** for FastAPI interactive Swagger documentation.

---

### Manual Step-by-Step Setup

#### 1. Compile the C Core Library

```bash
cd backend/c_core
gcc -shared -o libmissionsuite.so -fPIC mission_suite.c
cd ../..
```

#### 2. Set Up and Run the Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Verify backend health at: [http://localhost:8000/api/exp4/status](http://localhost:8000/api/exp4/status)

#### 3. Run the Frontend

In a separate terminal, from the project root:

```bash
npm install
npm run dev
```

---

## Cloud Deployment

### 1. Backend on Render
The project includes a Render Blueprint ([`render.yaml`](./render.yaml)) configured for automatic C shared library compilation:
```yaml
services:
  - type: web
    name: somaiyasat-backend
    env: python
    plan: free
    buildCommand: "gcc -shared -o backend/c_core/libmissionsuite.so -fPIC backend/c_core/mission_suite.c && pip install -r backend/requirements.txt"
    startCommand: "uvicorn main:app --app-dir backend --host 0.0.0.0 --port $PORT"
```

### 2. Frontend on Vercel
Deploy to Vercel and connect your Render backend:
```env
NEXT_PUBLIC_API_URL=https://somaiyasat-backend.onrender.com
```

---

## Project Structure

```
ds-miniproject/
├── app/
│   ├── api/                      # Next.js Serverless API Route Handlers
│   │   ├── exp1/satnogs/fetch/   # Resilient SatNOGS pass ingestion
│   │   ├── exp4/status/          # Cloud health check handler
│   │   └── satnogs/telemetry/    # Direct SatNOGS CORS proxy & fallback
│   ├── layout.tsx                # Global layout, metadata & favicon
│   ├── page.tsx                  # Home page assembling all sections
│   └── globals.css               # Global theme tokens and styles
├── backend/
│   ├── c_core/
│   │   ├── mission_suite.c       # Pure C data structures implementation
│   │   ├── mission_suite.h       # C header definitions
│   │   └── libmissionsuite.so    # Compiled C shared object
│   ├── Dockerfile                # Production container deployment
│   ├── main.py                   # FastAPI application & ctypes bindings
│   └── requirements.txt          # Python dependencies
├── components/
│   ├── brand/                    # Brand typography and blueprint SVGs
│   ├── layout/                   # TopBar and Footer components
│   ├── sections/                 # 8 interactive algorithm console sections
│   └── three/                    # Three.js 3D satellite and Earth models
├── lib/
│   ├── config.ts                 # Project metadata & dimensional specs
│   ├── satnogsClient.ts          # Resilient SatNOGS client with fallback
│   ├── lenis.ts                  # Smooth scrolling provider
│   └── palette.ts                # Aerospace color definitions
├── render.yaml                   # 1-Click Render Cloud Blueprint
├── start.sh                      # Unified dev launcher script
└── README.md
```

---

## Faculty Ownership & Acknowledgements

- **Dr. Umesh Shinde** — Associate Professor, Basic Science & Humanities, K J Somaiya Institute of Technology
- **Dr. Shailesh Nikam** — Professor, Mechanical Engineering, K J Somaiya School of Engineering
- **Somaiya Vidyavihar University** — Department of Information Technology
