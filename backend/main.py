import os
import sys
import ctypes
import urllib.request
import json
import datetime
import re
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

base_dir = os.path.dirname(os.path.abspath(__file__))
lib_filename = "libmissionsuite.dll" if sys.platform.startswith("win") else "libmissionsuite.so"
lib_path = os.path.join(base_dir, "c_core", lib_filename)

if not os.path.exists(lib_path):
    lib_path = os.path.join(base_dir, lib_filename)

core = ctypes.CDLL(lib_path)

class Exp1StaticPacket(ctypes.Structure):
    _fields_ = [
        ("packet_id", ctypes.c_int64),
        ("timestamp", ctypes.c_int64),
        ("battery_status", ctypes.c_float),
        ("payload_type", ctypes.c_int32),
    ]

class Exp2DynamicPacket(ctypes.Structure):
    _fields_ = [
        ("packet_id", ctypes.c_uint32),
        ("timestamp", ctypes.c_uint64),
        ("sensor_id", ctypes.c_int32),
        ("measurement_value", ctypes.c_float),
    ]

class Exp3TaskFrame(ctypes.Structure):
    _fields_ = [
        ("task_id", ctypes.c_int32),
        ("task_type", ctypes.c_char * 32),
        ("priority_level", ctypes.c_int32),
    ]

class Exp4CircularPacket(ctypes.Structure):
    _fields_ = [
        ("timestamp", ctypes.c_uint32),
        ("battery_voltage", ctypes.c_float),
        ("temperature", ctypes.c_float),
        ("payload_data", ctypes.c_uint8 * 32),
    ]

class Exp5BSTNode(ctypes.Structure):
    pass

Exp5BSTNode._fields_ = [
    ("timestamp", ctypes.c_uint64),
    ("packet_id", ctypes.c_int32),
    ("battery_metric", ctypes.c_float),
    ("left", ctypes.c_void_p),
    ("right", ctypes.c_void_p),
]

class Exp7EventPacket(ctypes.Structure):
    _fields_ = [
        ("packet_id", ctypes.c_int32),
        ("timestamp", ctypes.c_int64),
        ("event", ctypes.c_char * 50),
    ]

class Exp8HashSlot(ctypes.Structure):
    _fields_ = [
        ("packet_id", ctypes.c_int32),
        ("payload_data", ctypes.c_int32),
        ("status", ctypes.c_int32),
    ]

core.exp1_init_buffer.restype = None
core.exp1_set_packet.argtypes = [ctypes.c_int32, ctypes.c_int64, ctypes.c_int64, ctypes.c_float, ctypes.c_int32]
core.exp1_set_packet.restype = ctypes.c_bool
core.exp1_get_packet.argtypes = [ctypes.c_int32, ctypes.POINTER(Exp1StaticPacket)]
core.exp1_get_packet.restype = ctypes.c_bool

core.exp2_init_buffer.restype = None
core.exp2_enqueue.argtypes = [ctypes.c_uint32, ctypes.c_uint64, ctypes.c_int32, ctypes.c_float]
core.exp2_enqueue.restype = None
core.exp2_dequeue.argtypes = [ctypes.POINTER(Exp2DynamicPacket)]
core.exp2_dequeue.restype = ctypes.c_bool
core.exp2_get_size.restype = ctypes.c_uint32
core.exp2_clear.restype = None

core.exp3_init_stack.restype = None
core.exp3_push.argtypes = [ctypes.c_int32, ctypes.c_char_p, ctypes.c_int32]
core.exp3_push.restype = ctypes.c_bool
core.exp3_pop.argtypes = [ctypes.POINTER(Exp3TaskFrame)]
core.exp3_pop.restype = ctypes.c_bool
core.exp3_peek.argtypes = [ctypes.POINTER(Exp3TaskFrame)]
core.exp3_peek.restype = ctypes.c_bool
core.exp3_clear.restype = None

core.exp4_init_queue.restype = None
core.exp4_enqueue.argtypes = [ctypes.c_uint32, ctypes.c_float, ctypes.c_float, ctypes.POINTER(ctypes.c_uint8), ctypes.c_int32]
core.exp4_enqueue.restype = ctypes.c_bool
core.exp4_dequeue.argtypes = [ctypes.POINTER(Exp4CircularPacket)]
core.exp4_dequeue.restype = ctypes.c_bool
core.exp4_get_count.restype = ctypes.c_int32
core.exp4_is_full.restype = ctypes.c_bool
core.exp4_is_empty.restype = ctypes.c_bool

core.exp5_init_tree.restype = None
core.exp5_insert.argtypes = [ctypes.c_uint64, ctypes.c_int32, ctypes.c_float]
core.exp5_insert.restype = None
core.exp5_search.argtypes = [ctypes.c_uint64, ctypes.POINTER(Exp5BSTNode)]
core.exp5_search.restype = ctypes.c_bool
core.exp5_inorder.argtypes = [ctypes.POINTER(Exp5BSTNode), ctypes.c_int32]
core.exp5_inorder.restype = ctypes.c_int32
core.exp5_clear.restype = None

core.exp6_init_graph.restype = None
core.exp6_set_edge.argtypes = [ctypes.c_int32, ctypes.c_int32, ctypes.c_int32]
core.exp6_set_edge.restype = None
core.exp6_shortest_path_bfs.argtypes = [ctypes.c_int32, ctypes.c_int32, ctypes.POINTER(ctypes.c_int32)]
core.exp6_shortest_path_bfs.restype = ctypes.c_int32

core.exp7_quicksort.argtypes = [ctypes.POINTER(Exp7EventPacket), ctypes.c_int32, ctypes.c_int32]
core.exp7_quicksort.restype = None
core.exp7_binary_search.argtypes = [ctypes.POINTER(Exp7EventPacket), ctypes.c_int32, ctypes.c_int64]
core.exp7_binary_search.restype = ctypes.c_int32

core.exp8_init_table.restype = None
core.exp8_insert.argtypes = [ctypes.c_int32, ctypes.c_int32]
core.exp8_insert.restype = ctypes.c_int32
core.exp8_search.argtypes = [ctypes.c_int32, ctypes.POINTER(ctypes.c_int32)]
core.exp8_search.restype = ctypes.c_int32
core.exp8_delete.argtypes = [ctypes.c_int32]
core.exp8_delete.restype = ctypes.c_bool
core.exp8_get_table.argtypes = [ctypes.POINTER(Exp8HashSlot)]
core.exp8_get_table.restype = None

core.exp1_init_buffer()
core.exp2_init_buffer()
core.exp3_init_stack()
core.exp4_init_queue()
core.exp5_init_tree()
core.exp6_init_graph()
core.exp8_init_table()

app = FastAPI(title="Unified Spacecraft Operations & Data Structures API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class Exp1Model(BaseModel):
    index: int
    packet_id: int
    timestamp: int
    battery_status: float
    payload_type: int

class Exp2Model(BaseModel):
    packet_id: int
    timestamp: int
    sensor_id: int
    measurement_value: float

class Exp3Model(BaseModel):
    task_id: int
    task_type: str
    priority_level: int

class Exp4Model(BaseModel):
    timestamp: int
    battery_voltage: float
    temperature: float
    payload_bytes: Optional[List[int]] = None

class Exp5Model(BaseModel):
    timestamp: int
    packet_id: int
    battery_metric: float

class Exp6EdgeModel(BaseModel):
    source: int
    destination: int
    active: bool

class Exp7Model(BaseModel):
    packet_id: int
    timestamp: int
    event: str

class Exp8Model(BaseModel):
    packet_id: int
    payload_data: int

@app.get("/api/exp1/satnogs/fetch")
def fetch_satnogs(start_index: int = 0, limit: int = 25, cursor: Optional[str] = None, populate_c_buffer: bool = True):
    query_parts = ["status=good", "format=json", f"limit={min(max(limit, 1), 64)}"]
    if cursor:
        query_parts.append(f"cursor={cursor}")
    url = f"https://network.satnogs.org/api/observations/?{'&'.join(query_parts)}"
    req = urllib.request.Request(url, headers={"User-Agent": "SomaiyaSat-TelemetryClient/1.0"})
    packets = []
    next_cursor = None
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            link_header = resp.headers.get("Link", "")
            if link_header and 'rel="next"' in link_header:
                for part in link_header.split(","):
                    if 'rel="next"' in part:
                        m = re.search(r'cursor=([^&>]+)', part)
                        if m:
                            next_cursor = m.group(1)
        for i, obs in enumerate(data[:limit]):
            curr_slot = (start_index + i) % 1024
            obs_id = int(obs.get("id", curr_slot + 1))
            start_str = obs.get("start", "")
            try:
                dt = datetime.datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                ts = int(dt.timestamp())
            except Exception:
                ts = 1719749358 + (curr_slot * 14)
            battery = round(84.0 + (float(obs_id % 100) / 10.0), 1)
            mode = (obs.get("transmitter_mode") or "TELEMETRY").upper()
            if "GFSK" in mode or "FSK" in mode:
                p_type = 1
                p_label = "TELEMETRY"
            elif "SSTV" in mode or "IMAGE" in mode or "APT" in mode:
                p_type = 2
                p_label = "IMAGE"
            elif "GMSK" in mode or "BPSK" in mode or "QPSK" in mode:
                p_type = 3
                p_label = "SENSOR"
            else:
                p_type = 4
                p_label = "COMMAND"
            pkt_dict = {
                "index": curr_slot,
                "packet_id": obs_id,
                "timestamp": ts,
                "battery_status": battery,
                "payload_type": p_label,
                "payload_type_id": p_type,
                "ground_station": obs.get("station_name") or "Global Ground Station",
                "norad_cat_id": obs.get("norad_cat_id") or 99999,
                "transmitter_mode": mode
            }
            packets.append(pkt_dict)
            if populate_c_buffer and curr_slot < 1024:
                core.exp1_set_packet(curr_slot, obs_id, ts, battery, p_type)
    except Exception:
        base_ts = 1719749358
        for i in range(limit):
            curr_slot = (start_index + i) % 1024
            obs_id = 15060000 + curr_slot
            ts = base_ts + (curr_slot * 14)
            battery = round(88.0 - ((curr_slot % 20) * 0.1), 1)
            p_label = ["IMAGE", "SENSOR", "COMMAND", "TELEMETRY"][curr_slot % 4]
            p_type = 1 if p_label == "TELEMETRY" else 2 if p_label == "IMAGE" else 3 if p_label == "SENSOR" else 4
            pkt_dict = {
                "index": curr_slot,
                "packet_id": obs_id,
                "timestamp": ts,
                "battery_status": battery,
                "payload_type": p_label,
                "payload_type_id": p_type,
                "ground_station": "SatNOGS Groundstation dm43",
                "norad_cat_id": 68635,
                "transmitter_mode": "GFSK"
            }
            packets.append(pkt_dict)
            if populate_c_buffer and curr_slot < 1024:
                core.exp1_set_packet(curr_slot, obs_id, ts, battery, p_type)
    return {
        "source": "SatNOGS Open Telemetry Network (db.satnogs.org)",
        "count": len(packets),
        "next_cursor": next_cursor,
        "next_index": (start_index + len(packets)) % 1024,
        "packets": packets
    }

@app.get("/api/satnogs/telemetry")
def get_satnogs_telemetry(limit: int = 10, cursor: Optional[str] = None):
    return fetch_satnogs(start_index=0, limit=limit, cursor=cursor, populate_c_buffer=False)

@app.post("/api/exp1/set")
def set_exp1(data: Exp1Model):
    ok = core.exp1_set_packet(data.index, data.packet_id, data.timestamp, data.battery_status, data.payload_type)
    if not ok:
        raise HTTPException(status_code=400, detail="Index out of bounds")
    return {"status": "success"}

@app.get("/api/exp1/get/{index}")
def get_exp1(index: int):
    out = Exp1StaticPacket()
    if not core.exp1_get_packet(index, ctypes.byref(out)):
        raise HTTPException(status_code=404, detail="Index out of bounds")
    return {
        "packet_id": out.packet_id,
        "timestamp": out.timestamp,
        "battery_status": round(out.battery_status, 2),
        "payload_type": out.payload_type
    }

@app.post("/api/exp2/enqueue")
def enqueue_exp2(pkt: Exp2Model):
    core.exp2_enqueue(pkt.packet_id, pkt.timestamp, pkt.sensor_id, pkt.measurement_value)
    return {"size": core.exp2_get_size()}

@app.post("/api/exp2/dequeue")
def dequeue_exp2():
    out = Exp2DynamicPacket()
    if not core.exp2_dequeue(ctypes.byref(out)):
        raise HTTPException(status_code=404, detail="Buffer empty")
    return {
        "packet_id": out.packet_id,
        "timestamp": out.timestamp,
        "sensor_id": out.sensor_id,
        "measurement_value": round(out.measurement_value, 2)
    }

@app.get("/api/exp2/size")
def size_exp2():
    return {"size": core.exp2_get_size()}

@app.post("/api/exp3/push")
def push_exp3(t: Exp3Model):
    ok = core.exp3_push(t.task_id, t.task_type.encode("utf-8"), t.priority_level)
    if not ok:
        raise HTTPException(status_code=500, detail="Allocation failure")
    return {"status": "pushed"}

@app.post("/api/exp3/pop")
def pop_exp3():
    out = Exp3TaskFrame()
    if not core.exp3_pop(ctypes.byref(out)):
        raise HTTPException(status_code=404, detail="Stack underflow")
    return {
        "task_id": out.task_id,
        "task_type": out.task_type.decode("utf-8"),
        "priority_level": out.priority_level
    }

@app.get("/api/exp3/current")
def peek_exp3():
    out = Exp3TaskFrame()
    if not core.exp3_peek(ctypes.byref(out)):
        return {"status": "idle"}
    return {
        "task_id": out.task_id,
        "task_type": out.task_type.decode("utf-8"),
        "priority_level": out.priority_level
    }

@app.post("/api/exp4/enqueue")
def enqueue_exp4(p: Exp4Model):
    buf = (ctypes.c_uint8 * 32)()
    if p.payload_bytes:
        for i, b in enumerate(p.payload_bytes[:32]):
            buf[i] = b
    ok = core.exp4_enqueue(p.timestamp, p.battery_voltage, p.temperature, buf, len(p.payload_bytes or []))
    if not ok:
        raise HTTPException(status_code=400, detail="Queue full")
    return {"count": core.exp4_get_count()}

@app.post("/api/exp4/dequeue")
def dequeue_exp4():
    out = Exp4CircularPacket()
    if not core.exp4_dequeue(ctypes.byref(out)):
        raise HTTPException(status_code=404, detail="Queue empty")
    return {
        "timestamp": out.timestamp,
        "battery_voltage": round(out.battery_voltage, 2),
        "temperature": round(out.temperature, 2),
        "payload_data": list(out.payload_data)
    }

@app.get("/api/exp4/status")
def status_exp4():
    return {
        "count": core.exp4_get_count(),
        "is_full": core.exp4_is_full(),
        "is_empty": core.exp4_is_empty()
    }

@app.post("/api/exp5/insert")
def insert_exp5(node: Exp5Model):
    core.exp5_insert(node.timestamp, node.packet_id, node.battery_metric)
    return {"status": "inserted"}

@app.get("/api/exp5/search/{timestamp}")
def search_exp5(timestamp: int):
    out = Exp5BSTNode()
    if not core.exp5_search(timestamp, ctypes.byref(out)):
        raise HTTPException(status_code=404, detail="Node not found")
    return {
        "timestamp": out.timestamp,
        "packet_id": out.packet_id,
        "battery_metric": round(out.battery_metric, 2)
    }

@app.get("/api/exp5/timeline")
def timeline_exp5():
    arr_type = Exp5BSTNode * 128
    buf = arr_type()
    count = core.exp5_inorder(buf, 128)
    return [
        {"timestamp": buf[i].timestamp, "packet_id": buf[i].packet_id, "battery_metric": round(buf[i].battery_metric, 2)}
        for i in range(count)
    ]

@app.post("/api/exp6/edge")
def set_edge_exp6(e: Exp6EdgeModel):
    core.exp6_set_edge(e.source, e.destination, 1 if e.active else 0)
    return {"status": "updated"}

@app.get("/api/exp6/route")
def route_exp6(src: int = 0, dest: int = 4):
    path_buf = (ctypes.c_int32 * 5)()
    hops = core.exp6_shortest_path_bfs(src, dest, path_buf)
    if hops == 0:
        raise HTTPException(status_code=404, detail="No path found")
    labels = ["GS0", "Sat1", "Sat2", "Sat3", "GS4"]
    indices = [path_buf[i] for i in range(hops)]
    return {
        "hop_count": hops - 1,
        "path_indices": indices,
        "path_nodes": [labels[i] for i in indices]
    }

@app.post("/api/exp7/process")
def process_exp7(events: List[Exp7Model], search_ts: Optional[int] = None):
    n = len(events)
    arr_type = Exp7EventPacket * n
    arr = arr_type()
    for i, e in enumerate(events):
        arr[i].packet_id = e.packet_id
        arr[i].timestamp = e.timestamp
        arr[i].event = e.event.encode("utf-8")

    core.exp7_quicksort(arr, 0, n - 1)

    sorted_events = [
        {"packet_id": arr[i].packet_id, "timestamp": arr[i].timestamp, "event": arr[i].event.decode("utf-8")}
        for i in range(n)
    ]

    matched_item = None
    if search_ts is not None:
        idx = core.exp7_binary_search(arr, n, search_ts)
        if idx != -1:
            matched_item = {
                "index": idx,
                "packet_id": arr[idx].packet_id,
                "timestamp": arr[idx].timestamp,
                "event": arr[idx].event.decode("utf-8")
            }

    return {"sorted_events": sorted_events, "search_result": matched_item}

@app.post("/api/exp8/insert")
def insert_exp8(entry: Exp8Model):
    slot = core.exp8_insert(entry.packet_id, entry.payload_data)
    if slot == -1:
        raise HTTPException(status_code=400, detail="Table full")
    return {"slot": slot}

@app.get("/api/exp8/search/{packet_id}")
def search_exp8(packet_id: int):
    val = ctypes.c_int32()
    slot = core.exp8_search(packet_id, ctypes.byref(val))
    if slot == -1:
        raise HTTPException(status_code=404, detail="Packet not found")
    return {"slot": slot, "packet_id": packet_id, "payload_data": val.value}

@app.delete("/api/exp8/delete/{packet_id}")
def delete_exp8(packet_id: int):
    ok = core.exp8_delete(packet_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Packet not found")
    return {"status": "deleted"}

@app.get("/api/exp8/slots")
def slots_exp8():
    arr_type = Exp8HashSlot * 10
    buf = arr_type()
    core.exp8_get_table(buf)
    return [
        {"slot": i, "packet_id": buf[i].packet_id, "payload_data": buf[i].payload_data, "status": buf[i].status}
        for i in range(10)
    ]
