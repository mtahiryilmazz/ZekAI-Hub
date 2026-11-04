#!/usr/bin/env python3
"""
swarm_sim.py — Lean Hybrid Agent Swarm için olay üreteci, CLI ve SSE sunucusu.

Tek amaç: tek bir olay sözleşmesinin (domain_events) hem terminali hem de
2.5D "Ops Floor" sahnesini beslediğini kanıtlamak. Bu bir üretim çekirdeği
değildir; sözleşmeyi ve arayüz ayrımını doğrulayan bir geliştirme aracıdır.

Kullanım:
    python tools/swarm_sim.py run --speed 2      # terminalde canlı akış
    python tools/swarm_sim.py serve --port 8787  # Ops Floor + /events (SSE)
    python tools/swarm_sim.py replay out.jsonl   # kayıtlı olayları yeniden oynat
    python tools/swarm_sim.py check out.jsonl    # şema doğrulama (CI için)

Yalnızca standart kütüphane kullanır.
"""

from __future__ import annotations

import argparse
import gzip
import json
import mimetypes
import os
import queue
import sys
import threading
import time
import urllib.error
import urllib.request
import uuid
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent.parent
STATIC_DIR = ROOT / "apps" / "ops-floor"
BUDGET_USD = 0.50
SCHEMA_VERSION = 1

# --------------------------------------------------------------------------
# Olay modeli
# --------------------------------------------------------------------------

REQUIRED = ("v", "id", "ts", "type", "agent_id", "msg")


@dataclass
class Ev:
    type: str
    agent_id: str
    msg: str
    zone: str = "ops"
    severity: str = "info"
    cost_usd: float = 0.0
    tokens: dict = field(default_factory=dict)
    task_id: str = "tsk_demo"

    def envelope(self) -> dict:
        return {
            "v": SCHEMA_VERSION,
            "id": uuid.uuid4().hex[:12],
            "ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "type": self.type,
            "task_id": self.task_id,
            "agent_id": self.agent_id,
            "zone": self.zone,
            "severity": self.severity,
            "msg": self.msg,
            "tokens": self.tokens,
            "cost_usd": round(self.cost_usd, 6),
            "ref": None,
        }


def zone_of(agent: str) -> str:
    return {
        "planner": "plan",
        "researcher": "plan",
        "analyst": "field",
        "builder": "field",
        "reviewer": "review",
        "supervisor": "ops",
        "system": "ops",
    }.get(agent, "ops")


def scenario(task_id: str):
    """Bir görev turunun olay dizisi: (gecikme_sn, Ev)."""

    def s(typ: str, agent: str, msg: str, **kw) -> tuple[str, Ev]:
        kw.setdefault("severity", "info")
        return typ, Ev(type=typ, agent_id=agent, msg=msg, zone=zone_of(agent), task_id=task_id, **kw)

    return [
        s("task.created", "supervisor", "Görev alındı · kapsam doğrulanıyor", cost_usd=0.0004, tokens={"in": 520, "out": 100}),
        s("task.planned", "planner", "Plan çıktı: 4 alt görev, 2 paralel kol", cost_usd=0.0032, tokens={"in": 1800, "out": 340}),
        s("agent.started", "researcher", "Kaynak taraması başladı (3 site, 1 PDF)", cost_usd=0.0011, tokens={"in": 720, "out": 160}),
        s("model.completed", "researcher", "12 kaynak ayıklandı, 4'ü birincil", cost_usd=0.0026, tokens={"in": 2600, "out": 500}),
        s("agent.started", "analyst", "Fiyat serisi ile pazar payı karşılaştırılıyor", cost_usd=0.0009, tokens={"in": 600, "out": 140}),
        s("agent.progress", "builder", "Rapor iskeleti + 3 grafik üretiliyor", cost_usd=0.0041, tokens={"in": 3400, "out": 620}),
        s("model.completed", "analyst", "3 bulgu, 1 çelişki işaretlendi", cost_usd=0.0038, tokens={"in": 2400, "out": 460}),
        s("tool.proposed", "builder", "reports/2026-Q4.md üzerine yazma izni istendi", severity="warn"),
        s("approval.required", "builder", "Onay bekliyor · fs.write", severity="warn"),
        s("tool.completed", "builder", "Dosya yazıldı · 18.4 KB · 42 ms", severity="ok"),
        s("agent.started", "reviewer", "Sayılar ve kaynak eşleşmesi denetleniyor", cost_usd=0.0014, tokens={"in": 900, "out": 200}),
        s("review.failed", "reviewer", "1 grafikte eksen birimi hatalı — düzeltmeye dönüldü", severity="err", cost_usd=0.0021, tokens={"in": 1400, "out": 280}),
        s("agent.progress", "builder", "Birim düzeltildi, yeniden üretildi", cost_usd=0.0018, tokens={"in": 1200, "out": 220}),
        s("task.completed", "supervisor", "Teslim: rapor + özet + kaynak listesi", severity="ok", cost_usd=0.0012, tokens={"in": 820, "out": 120}),
    ]


# Gecikmeler (sn) — olay tipine göre ritim
DELAYS = {
    "task.created": 0.6,
    "task.planned": 1.2,
    "agent.started": 0.9,
    "model.completed": 1.6,
    "agent.progress": 1.3,
    "tool.proposed": 0.5,
    "approval.required": 0.4,
    "tool.completed": 1.0,
    "review.failed": 1.4,
    "task.completed": 5.0,
}

# --------------------------------------------------------------------------
# ANSI (Windows dahil)
# --------------------------------------------------------------------------

if os.name == "nt":
    try:
        import ctypes

        k = ctypes.windll.kernel32
        k.SetConsoleMode(k.GetStdHandle(-11), 7)
    except Exception:
        pass

C = {
    "dim": "\x1b[2m", "b": "\x1b[1m", "off": "\x1b[0m",
    "amber": "\x1b[33m", "teal": "\x1b[36m", "red": "\x1b[31m",
    "green": "\x1b[32m", "violet": "\x1b[35m", "blue": "\x1b[34m",
}
AGENT_COLOR = {
    "supervisor": C["amber"], "planner": C["teal"], "researcher": C["blue"],
    "analyst": C["violet"], "builder": C["green"], "reviewer": C["red"],
}


def human(n: float) -> str:
    return f"{n:.4f}"


def print_event(e: dict, total: float) -> None:
    t = e["ts"][11:19]
    col = AGENT_COLOR.get(e["agent_id"], C["dim"])
    sev = e["severity"]
    mark = "!" if sev in ("warn", "error") else "·"
    if sev == "err":
        mark, col = "x", C["red"]
    cost = f"${e['cost_usd']:.4f}" if e["cost_usd"] else ""
    print(
        f"{C['dim']}{t}{C['off']} {mark} {col}{e['agent_id']:<11}{C['off']}"
        f"{e['msg']}  {C['dim']}{cost}{C['off']}"
    )
    print(f"{C['dim']}          toplam ${human(total)} · {e['type']}{C['off']}")


# --------------------------------------------------------------------------
# CLI run
# --------------------------------------------------------------------------

def cmd_run(args) -> int:
    task_id = "tsk_" + uuid.uuid4().hex[:4]
    total = 0.0
    print(f"{C['b']}ZekAI Hub · Lean Swarm CLI{C['off']}  {C['dim']}görev {task_id} · bütçe ${BUDGET_USD:.2f}{C['off']}")
    print(f"{C['dim']}Ctrl+C ile çık · hız {args.speed}×{C['off']}\n")
    try:
        for _ in range(args.tasks):
            for _typ, ev in scenario(task_id):
                e = ev.envelope()
                total += e["cost_usd"]
                print_event(e, total)
                time.sleep(DELAYS.get(e["type"], 1.0) / args.speed)
            print(f"\n{C['teal']}✓ görev tamamlandı{C['off']} {C['dim']}toplam ${human(total)}{C['off']}\n")
            task_id = "tsk_" + uuid.uuid4().hex[:4]
    except KeyboardInterrupt:
        print(f"\n{C['dim']}durduruldu · toplam ${human(total)}{C['off']}")
    return 0


# --------------------------------------------------------------------------
# SSE sunucusu
# --------------------------------------------------------------------------

class Hub:
    """Tek olay hattı: bütün istemciler aynı zarfı alır."""

    def __init__(self) -> None:
        self.clients: list[queue.Queue] = []
        self.lock = threading.Lock()
        self.gate = threading.Event()
        self.pending = False
        self.total = 0.0
        self.events = 0
        self.history: deque[str] = deque(maxlen=200)

    def publish(self, e: dict) -> None:
        self.total += e["cost_usd"]
        self.events += 1
        payload = "data: " + json.dumps(e, ensure_ascii=False) + "\n\n"
        with self.lock:
            self.history.append(payload)
            dead = []
            for q in self.clients:
                try:
                    q.put_nowait(payload)
                except queue.Full:
                    dead.append(q)
            for q in dead:
                self.clients.remove(q)

    def register(self) -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=256)
        with self.lock:
            self.clients.append(q)
        return q

    def unregister(self, q: queue.Queue) -> None:
        with self.lock:
            if q in self.clients:
                self.clients.remove(q)


HUB = Hub()

# statik dosya önbelleği: (yol, mtime) -> (gövde, gzip gövde)
_FILE_CACHE: dict[tuple[str, float], tuple[bytes, bytes]] = {}

def cached_file(path: Path) -> tuple[bytes, bytes]:
    key = (str(path), path.stat().st_mtime)
    hit = _FILE_CACHE.get(key)
    if hit:
        return hit
    raw = path.read_bytes()
    gz = gzip.compress(raw, 6)
    _FILE_CACHE.clear()
    _FILE_CACHE[key] = (raw, gz)
    return raw, gz


# --------------------------------------------------------------------------
# Sağlayıcı geçidi (BYOK) — anahtar yalnızca yerel dosyada, tarayıcıya dönmez
# --------------------------------------------------------------------------

CONFIG_DIR = Path.home() / ".zekai"
CONFIG_PATH = CONFIG_DIR / "config.json"

# USD / 1M token; bilinmeyen modelde maliyet 0 gösterilir (tahmin üretilmez)
PRICES = {
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4o": (2.50, 10.00),
    "claude-3-5-haiku-latest": (0.80, 4.00),
    "claude-sonnet-4-20250514": (3.00, 15.00),
}


def load_cfg() -> dict:
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_cfg(cfg: dict) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        os.chmod(CONFIG_PATH, 0o600)
    except Exception:
        pass


def public_cfg() -> dict:
    cfg = load_cfg()
    key = cfg.get("api_key") or ""
    return {
        "provider": cfg.get("provider", "mock"),
        "model": cfg.get("model", "mock-1"),
        "base_url": cfg.get("base_url", ""),
        "has_key": bool(key),
        "key_hint": ("••••" + key[-4:]) if key else "",
        "tiers": cfg.get("tiers", {}),
    }


def cost_of(model: str, tin: int, tout: int) -> float:
    pin, pout = PRICES.get(model, (0.0, 0.0))
    return round((tin / 1_000_000) * pin + (tout / 1_000_000) * pout, 6)


def call_model(messages: list[dict], tier: str = "") -> dict:
    cfg = load_cfg()
    provider = cfg.get("provider", "mock")
    tiers = cfg.get("tiers") or {}
    model = (tiers.get(tier) if tier else "") or cfg.get("model") or "mock-1"

    if provider == "mock":
        prompt = messages[-1]["content"] if messages else ""
        time.sleep(0.6)
        text = (
            "Mock yanıt: istem alındı.\n\n"
            f"“{prompt[:160]}”\n\n"
            "Gerçek model için Ayarlar'dan sağlayıcı, model ve API anahtarı girin."
        )
        return {"text": text, "model": model, "provider": provider, "tier": tier,
                "usage": {"in": max(1, len(prompt) // 4), "out": max(1, len(text) // 4)},
                "cost_usd": 0.0}

    key = cfg.get("api_key")
    if not key:
        raise ValueError("API anahtarı yok — Ayarlar'dan ekleyin")

    if provider == "anthropic":
        base = (cfg.get("base_url") or "https://api.anthropic.com").rstrip("/")
        system = "\n".join(m["content"] for m in messages if m["role"] == "system")
        msgs = [{"role": m["role"], "content": m["content"]} for m in messages if m["role"] != "system"]
        body = {"model": model, "max_tokens": 800, "messages": msgs}
        if system:
            body["system"] = system
        req = urllib.request.Request(
            base + "/v1/messages",
            data=json.dumps(body).encode(),
            method="POST",
            headers={"content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01"},
        )
    else:  # openai ve openai-uyumlu
        base = (cfg.get("base_url") or "https://api.openai.com/v1").rstrip("/")
        body = {"model": model, "messages": messages, "max_tokens": 800}
        req = urllib.request.Request(
            base + "/chat/completions",
            data=json.dumps(body).encode(),
            method="POST",
            headers={"content-type": "application/json", "authorization": f"Bearer {key}"},
        )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode()[:300]
        except Exception:
            pass
        raise ValueError(f"sağlayıcı hatası {exc.code}: {detail}") from None
    except Exception as exc:
        raise ValueError(f"bağlantı hatası: {exc}") from None

    if provider == "anthropic":
        parts = data.get("content") or []
        text = "".join(p.get("text", "") for p in parts if p.get("type") == "text")
        usage = data.get("usage", {})
        tin, tout = usage.get("input_tokens", 0), usage.get("output_tokens", 0)
    else:
        choices = data.get("choices") or [{}]
        text = (choices[0].get("message") or {}).get("content", "")
        usage = data.get("usage", {})
        tin, tout = usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)

    return {"text": text, "model": model, "provider": provider, "tier": tier,
            "usage": {"in": tin, "out": tout}, "cost_usd": cost_of(model, tin, tout)}



def producer(speed: float) -> None:
    task_no = 0
    while True:
        task_no += 1
        task_id = f"tsk_{task_no:03d}"
        for _typ, ev in scenario(task_id):
            e = ev.envelope()
            HUB.publish(e)
            time.sleep(DELAYS.get(e["type"], 1.0) / speed)
            if e["type"] == "approval.required":
                HUB.pending = True
                HUB.gate.clear()
                # onay gelmezse 60 sn sonra devam (demo)
                HUB.gate.wait(timeout=60)
                HUB.pending = False
        time.sleep(4)


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *a):  # sessiz
        pass

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/health":
            self._json({"ok": True, "events": HUB.events, "cost_usd": round(HUB.total, 4),
                        "clients": len(HUB.clients), "pending": HUB.pending})
            return

        if path == "/api/settings":
            self._json(public_cfg())
            return

        if path == "/api/models":
            files = []
            models_dir = STATIC_DIR / "models"
            if models_dir.is_dir():
                for p in sorted(models_dir.rglob("*")):
                    if p.is_file() and p.suffix.lower() in (".glb", ".gltf"):
                        files.append("/models/" + p.relative_to(models_dir).as_posix())
            self._json({"models": files[:120]})
            return

        if path == "/events":
            q = HUB.register()
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("X-Accel-Buffering", "no")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            try:
                self.wfile.write(b": connected\n\n")
                self.wfile.write(("data: " + json.dumps({"type": "hello"}) + "\n\n").encode())
                # geç katılan istemci için son olayları gönder (replay)
                for item in list(HUB.history):
                    self.wfile.write(item.encode())
                self.wfile.flush()
                while True:
                    try:
                        self.wfile.write(q.get(timeout=15).encode())
                        self.wfile.flush()
                    except queue.Empty:
                        self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass
            finally:
                HUB.unregister(q)
            return

        if path in ("/", "/index.html"):
            self._file(STATIC_DIR / "index.html", "text/html; charset=utf-8")
            return

        # modüller, vendor ve diğer statik dosyalar
        rel = path.lstrip("/")
        target = STATIC_DIR / rel
        ctype = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            ctype += "; charset=utf-8"
        self._file(target, ctype)
        return

        self._json({"error": "not_found"}, 404)

    def _body(self) -> dict:
        n = int(self.headers.get("content-length") or 0)
        if n > 200_000:
            raise ValueError("istek çok büyük")
        raw = self.rfile.read(n) if n else b"{}"
        return json.loads(raw.decode("utf-8") or "{}")

    def do_POST(self):
        u = urlparse(self.path)

        if u.path == "/api/settings":
            try:
                data = self._body()
                cfg = load_cfg()
                for k in ("provider", "model", "base_url"):
                    if isinstance(data.get(k), str):
                        cfg[k] = data[k].strip()
                if isinstance(data.get("api_key"), str):
                    key = data["api_key"].strip()
                    if key:
                        cfg["api_key"] = key
                    elif data.get("clear_key"):
                        cfg.pop("api_key", None)
                if isinstance(data.get("tiers"), dict):
                    clean = {k: str(v).strip() for k, v in data["tiers"].items() if k in ("T1", "T2", "T3") and str(v).strip()}
                    cfg["tiers"] = clean
                save_cfg(cfg)
                self._json(public_cfg())
            except Exception as exc:
                self._json({"error": str(exc)}, 400)
            return

        if u.path == "/api/chat":
            try:
                data = self._body()
                msgs = data.get("messages") or []
                if not isinstance(msgs, list) or not msgs:
                    raise ValueError("mesaj yok")
                msgs = [m for m in msgs if isinstance(m, dict) and m.get("role") in ("user", "assistant", "system")][-8:]
                for m in msgs:
                    m["content"] = str(m.get("content", ""))[:4000]
                prompt = next((m["content"] for m in reversed(msgs) if m["role"] == "user"), "")

                HUB.publish(Ev("task.created", "supervisor", f"İstem: {prompt[:70]}").envelope())
                HUB.publish(Ev("agent.started", "supervisor", "Model çağrısı hazırlanıyor").envelope())
                result = call_model(msgs, str(data.get("tier") or ""))
                HUB.publish(Ev(
                    "model.completed", "supervisor",
                    f"{result['model']} · {result['usage']['in']}→{result['usage']['out']} token",
                    cost_usd=result["cost_usd"], tokens=result["usage"], severity="ok",
                ).envelope())
                HUB.publish(Ev("task.completed", "supervisor", "Yanıt teslim edildi", severity="ok").envelope())
                self._json(result)
            except Exception as exc:
                self._json({"error": str(exc)}, 502)
            return

        if u.path == "/approve":
            ok = parse_qs(u.query).get("ok", ["1"])[0] == "1"
            HUB.publish(Ev("approval.decided", "supervisor",
                           "Onay verildi" if ok else "Kullanıcı reddetti",
                           severity="ok" if ok else "err", task_id="tsk_live").envelope())
            HUB.gate.set()
            self._json({"ok": ok})
            return
        self._json({"error": "not_found"}, 404)

    def _file(self, p: Path, ctype: str):
        try:
            p = p.resolve()
            base = STATIC_DIR.resolve()
            if os.path.commonpath([str(base), str(p)]) != str(base) or not p.is_file():
                raise FileNotFoundError
            raw, gz = cached_file(p)
        except (FileNotFoundError, OSError, ValueError):
            self._json({"error": "not_found"}, 404)
            return

        use_gzip = p.suffix.lower() in (".js", ".css", ".svg", ".html", ".json") and "gzip" in self.headers.get("accept-encoding", "")
        data = gz if use_gzip else raw
        vendor = "/vendor/" in p.as_posix()

        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "public, max-age=31536000, immutable" if vendor else "no-store")
        self.send_header("Vary", "Accept-Encoding")
        if use_gzip:
            self.send_header("Content-Encoding", "gzip")
        self.end_headers()
        self.wfile.write(data)


def cmd_serve(args) -> int:
    if not (STATIC_DIR / "index.html").is_file():
        print(f"hata: {STATIC_DIR / 'index.html'} bulunamadı", file=sys.stderr)
        return 2
    threading.Thread(target=producer, args=(args.speed,), daemon=True).start()
    srv = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Ops Floor   → http://{args.host}:{args.port}/")
    print(f"Olay akışı  → http://{args.host}:{args.port}/events")
    print(f"Sağlık      → http://{args.host}:{args.port}/health")
    print("Ctrl+C ile çık\n")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\ndurdu")
    finally:
        srv.server_close()
    return 0


# --------------------------------------------------------------------------
# replay / check
# --------------------------------------------------------------------------

def read_events(path: Path):
    with path.open(encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                yield i, json.loads(line)
            except json.JSONDecodeError as exc:
                raise SystemExit(f"{path}:{i} geçersiz JSON: {exc}")


def validate(e: dict) -> list[str]:
    errs = []
    for k in REQUIRED:
        if k not in e:
            errs.append(f"eksik alan: {k}")
    if e.get("v") != SCHEMA_VERSION:
        errs.append(f"şema sürümü {e.get('v')} ≠ {SCHEMA_VERSION}")
    if e.get("severity") not in ("info", "warn", "error", "err", "ok"):
        errs.append(f"geçersiz severity: {e.get('severity')}")
    if not isinstance(e.get("cost_usd", 0), (int, float)):
        errs.append("cost_usd sayı değil")
    return errs


def cmd_check(args) -> int:
    bad = 0
    n = 0
    counts: dict[str, int] = {}
    total = 0.0
    for i, e in read_events(Path(args.file)):
        n += 1
        errs = validate(e)
        if errs:
            bad += 1
            print(f"{C['red']}{args.file}:{i} {', '.join(errs)}{C['off']}")
        counts[e.get("type", "?")] = counts.get(e.get("type", "?"), 0) + 1
        total += float(e.get("cost_usd") or 0)
    print(f"{C['b']}{n} olay{C['off']} · {len(counts)} tip · toplam ${human(total)}")
    for k, v in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"  {C['dim']}{k:<20}{C['off']} {v}")
    if bad:
        print(f"{C['red']}{bad} olay şemaya uymuyor{C['off']}")
        return 1
    print(f"{C['teal']}şema doğrulandı{C['off']}")
    return 0


def cmd_replay(args) -> int:
    total = 0.0
    for _, e in read_events(Path(args.file)):
        total += float(e.get("cost_usd") or 0)
        print_event(e, total)
        time.sleep(DELAYS.get(e.get("type"), 0.6) / args.speed)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Lean Swarm olay üreteci / Ops Floor sunucusu")
    sub = ap.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("run", help="terminalde canlı akış")
    r.add_argument("--speed", type=float, default=1.0)
    r.add_argument("--tasks", type=int, default=1)
    r.set_defaults(fn=cmd_run)

    s = sub.add_parser("serve", help="Ops Floor + SSE sunucusu")
    s.add_argument("--host", default="127.0.0.1")
    s.add_argument("--port", type=int, default=8787)
    s.add_argument("--speed", type=float, default=1.0)
    s.set_defaults(fn=cmd_serve)

    rp = sub.add_parser("replay", help="JSONL olaylarını yeniden oynat")
    rp.add_argument("file")
    rp.add_argument("--speed", type=float, default=1.0)
    rp.set_defaults(fn=cmd_replay)

    ck = sub.add_parser("check", help="JSONL şema doğrulama")
    ck.add_argument("file")
    ck.set_defaults(fn=cmd_check)

    args = ap.parse_args()
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
