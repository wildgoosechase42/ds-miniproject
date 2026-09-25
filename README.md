# SomaiyaSat Flight Computing Engine & Ground Control

Link:https://ds-miniproject.vercel.app/

[![Next.js](https://img.shields.io/badge/Next.js-16.3.6-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_ctypes-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![C](https://img.shields.io/badge/C-libmissionsuite.so-A8B9CC?logo=c)](https://en.wikipedia.org/wiki/C_(programming_language))
[![Three.js](https://img.shields.io/badge/Three.js-Orbital_3D-000000?logo=threedotjs)](https://threejs.org/)
[![License: Academic](https://img.shields.io/badge/License-Academic_Use-blue.svg)](#)

A high-performance in-memory orbital telemetry computing engine and interactive data structures laboratory built for **SomaiyaSat & SomaiyaPod** (PocketQube Mission KJS-SRS-01).

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
│              Next.js 16 Web Application (:3000)             │
│   • Three.js 3D Orbital Shells & GSAP Scroll Interactions    │
│   • Interactive Visualizers for 8 Spacecraft Data Structures│
│   • Aerospace Telemetry Dock & Responsive Flight Console    │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON via REST HTTP
┌──────────────────────────────▼──────────────────────────────┐
│                  FastAPI Backend (:8000)                    │
│   • Asynchronous Telemetry Orchestration                    │
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
| **08 · Direct Indexer** | Hash Table | Fast Sensor Lookup | Direct hash indexing mapping sensor identifiers to telemetry readings in instantaneous $O(1)$ time with collision handling. |

---

## Tech Stack

- **Core Flight Engine:** Pure C (`backend/c_core/mission_suite.c`), compiled as a shared library (`libmissionsuite.so`).
- **Backend API:** Python 3.12, FastAPI, Uvicorn, Python `ctypes`, SQLite / PostgreSQL cache.
- **Frontend Framework:** Next.js 16 (App Router), React 19, TypeScript.
- **Styling & Design System:** Tailwind CSS, JetBrains Mono & Space Grotesk typography, glassmorphism aerospace theme.
- **3D & Animation:** Three.js, GSAP ScrollTrigger, Lenis smooth scrolling.
- **Data Source:** SatNOGS Open Satellite Network Telemetry API.

---

## Getting Started

### Prerequisites

- **Node.js:** v18.18 or higher (v20+ recommended)
- **Python:** v3.10 or higher
- **GCC / Clang:** For compiling the C shared library

---

### 1. Compile the C Core Library

Navigate to the C core directory and build the shared library:

```bash
cd backend/c_core
gcc -shared -o libmissionsuite.so -fPIC mission_suite.c
cd ../..
```

---

### 2. Set Up the Backend

From the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt  # or: pip install fastapi uvicorn requests
uvicorn main:app --reload --port 8000
```

Verify backend health at: [http://localhost:8000/api/exp4/status](http://localhost:8000/api/exp4/status)

---

### 3. Set Up the Frontend

In a separate terminal, from the project root:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
ds-miniproject/
├── app/
│   ├── layout.tsx                # Global layout, metadata & favicon
│   ├── page.tsx                  # Home page assembling all sections
│   └── globals.css               # Global theme tokens and styles
├── backend/
│   ├── c_core/
│   │   ├── mission_suite.c       # Pure C data structures implementation
│   │   ├── mission_suite.h       # C header definitions
│   │   └── libmissionsuite.so    # Compiled C shared object
│   └── main.py                   # FastAPI application & ctypes bindings
├── components/
│   ├── brand/
│   │   ├── Brand.tsx             # Wordmark, labels, and typography
│   │   └── BuildArtwork.tsx      # Engineering blueprint SVGs
│   ├── layout/
│   │   ├── TopBar.tsx            # Sticky scroll-triggered navigation bar
│   │   └── Footer.tsx            # Project metadata and faculty credits
│   ├── sections/
│   │   ├── FlightEngine.tsx      # 8-experiment console workspace
│   │   ├── Exp1TelemetryArray.tsx
│   │   ├── Exp2DynamicBuffer.tsx
│   │   ├── Exp3TaskStack.tsx
│   │   ├── Exp4CircularQueue.tsx
│   │   ├── Exp5TimelineBST.tsx
│   │   ├── Exp6GraphRouting.tsx
│   │   ├── Exp7QuickSortSearch.tsx
│   │   └── Exp8HashIndexer.tsx
│   └── three/
│       ├── HeroScene.tsx         # 3D satellite orbit visualization
│       └── MiniEarth.tsx         # Interactive globe visualization
├── lib/
│   ├── config.ts                 # Project metadata & dimensional specs
│   ├── lenis.ts                  # Smooth scrolling provider
│   ├── palette.ts                # Aerospace color definitions
│   └── utils.ts                  # Classname merging utility
├── public/
│   ├── somaiya-logo.png          # Somaiya Vidyavihar University emblem
│   └── assets/img/               # Generated blueprint schematics
└── README.md
```

---

## Faculty Ownership & Acknowledgements

- **Dr. Umesh Shinde** — Associate Professor, Basic Science & Humanities, K J Somaiya Institute of Technology
- **Dr. Shailesh Nikam** — Professor, Mechanical Engineering, K J Somaiya School of Engineering
- **Somaiya Vidyavihar University** — Department of Information Technology
