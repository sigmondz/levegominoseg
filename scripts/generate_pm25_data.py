#!/usr/bin/env python3
"""Generate public/data/series.json and summary.json from pm25-sps30-2026.csv."""
from __future__ import annotations

import csv
import json
import math
import re
import sys
from datetime import datetime
from pathlib import Path

CHIP_ID = "esp8266-2702201"
INTERVAL_MIN = 3
TIME_FMT = "%Y-%m-%d %H:%M:%S"
VALUE_RE = re.compile(r"([\d.]+)")


def parse_value(raw: str | None) -> float | None:
    if raw is None or not str(raw).strip():
        return None
    m = VALUE_RE.search(str(raw).replace(",", "."))
    if not m:
        return None
    try:
        return float(m.group(1))
    except ValueError:
        return None


def detect_value_column(fieldnames: list[str]) -> str:
    for name in fieldnames:
        if name == "Time":
            continue
        if "PM" in name or "pm" in name.lower():
            return name
    non_time = [f for f in fieldnames if f != "Time"]
    if len(non_time) != 1:
        raise ValueError(f"Cannot detect value column from: {fieldnames}")
    return non_time[0]


def parse_sensor_metric(column: str) -> tuple[str, str]:
    parts = column.strip().split(None, 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return column.strip(), "PM2.5"


def format_date_time(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000).strftime(TIME_FMT)


def to_date_key(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000).strftime("%Y-%m-%d")


def day_label(ms: int) -> str:
    d = datetime.fromtimestamp(ms / 1000)
    return f"{d.month:02d}/{d.day:02d}"


def hour_label(ms: int) -> str:
    d = datetime.fromtimestamp(ms / 1000)
    return f"{d.month:02d}/{d.day:02d} {d.hour:02d}:00"


def start_of_local_day(ms: int) -> int:
    d = datetime.fromtimestamp(ms / 1000)
    return int(datetime(d.year, d.month, d.day).timestamp() * 1000)


def percentile(sorted_vals: list[float], p: float) -> float:
    if not sorted_vals:
        return 0.0
    i = round((p / 100) * (len(sorted_vals) - 1))
    return sorted_vals[i]


def build_summary(points: list[list], meta: dict, from_ms: int, to_ms: int) -> dict:
    day_ms = 24 * 60 * 60 * 1000
    hour_ms = 60 * 60 * 1000
    filtered = [[t, v] for t, v in points if from_ms <= t <= to_ms]
    vals = [v for _, v in filtered]
    sorted_vals = sorted(vals)
    span = max(0, to_ms - from_ms)
    use_hourly_trend = span <= 3 * day_ms
    daily_map: dict[str, list[float]] = {}
    hourly_map: dict[int, list[float]] = {}
    trend_map: dict[str, dict] = {}
    for t, v in filtered:
        dk = to_date_key(t)
        daily_map.setdefault(dk, []).append(v)
        hour = datetime.fromtimestamp(t / 1000).hour
        hourly_map.setdefault(hour, []).append(v)
        bucket_ms = (t // hour_ms) * hour_ms if use_hourly_trend else start_of_local_day(t)
        key = str(bucket_ms)
        trend_map.setdefault(key, {"ms": bucket_ms, "values": []})["values"].append(v)
    daily = []
    for date in sorted(daily_map.keys()):
        xs = daily_map[date]
        xs_sorted = sorted(xs)
        daily.append({
            "date": date,
            "label": day_label(int(datetime.strptime(date, "%Y-%m-%d").timestamp() * 1000)),
            "n": len(xs),
            "mean": round(sum(xs) / len(xs), 2),
            "max": round(max(xs), 2),
            "min": round(min(xs), 2),
            "p50": round(xs_sorted[len(xs_sorted) // 2], 2),
        })
    hourly_mean = [
        {"hour": hour, "mean": round(sum(xs) / len(xs), 2)}
        for hour in range(24)
        if (xs := hourly_map.get(hour))
    ]
    trend = [
        {
            "label": hour_label(b["ms"]) if use_hourly_trend else day_label(b["ms"]),
            "mean": round(sum(b["values"]) / len(b["values"]), 2),
            "max": round(max(b["values"]), 2),
        }
        for b in sorted(trend_map.values(), key=lambda x: x["ms"])
    ]
    valid = len(vals)
    expected = (
        math.floor(span / (meta["intervalMin"] * 60 * 1000)) + 1
        if meta["intervalMin"] > 0
        else valid
    )
    empty = max(0, expected - valid)
    return {
        "sensor": meta["sensor"],
        "metric": meta["metric"],
        "unit": meta["unit"],
        "chipId": meta["chipId"],
        "from": format_date_time(from_ms),
        "to": format_date_time(to_ms),
        "fromMs": from_ms,
        "toMs": to_ms,
        "intervalMin": meta["intervalMin"],
        "n": expected,
        "valid": valid,
        "empty": empty,
        "min": round(min(vals), 2) if valid else 0,
        "max": round(max(vals), 2) if valid else 0,
        "mean": round(sum(vals) / valid, 2) if valid else 0,
        "p50": round(percentile(sorted_vals, 50), 2) if valid else 0,
        "p95": round(percentile(sorted_vals, 95), 2) if valid else 0,
        "above15pct": round(100 * sum(1 for v in vals if v >= 15) / valid, 1) if valid else 0,
        "above25pct": round(100 * sum(1 for v in vals if v >= 25) / valid, 1) if valid else 0,
        "above80pct": round(100 * sum(1 for v in vals if v >= 80) / valid, 1) if valid else 0,
        "daysAboveWho": sum(1 for d in daily if d["mean"] >= 15),
        "daysTotal": (
            int(
                (
                    datetime.strptime(to_date_key(to_ms), "%Y-%m-%d")
                    - datetime.strptime(to_date_key(from_ms), "%Y-%m-%d")
                ).days
            )
            + 1
            if to_ms >= from_ms
            else 0
        ),
        "daily": daily,
        "hourlyMean": hourly_mean,
        "trend": trend,
        "trendGrain": "hour" if use_hourly_trend else "day",
    }


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    csv_path = root / "public/data/pm25-sps30-2026.csv"
    series_path = root / "public/data/series.json"
    summary_path = root / "public/data/summary.json"
    points: list[list] = []
    with csv_path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise SystemExit("CSV has no header")
        value_col = detect_value_column(list(reader.fieldnames))
        sensor, metric = parse_sensor_metric(value_col)
        for row in reader:
            t_raw = (row.get("Time") or "").strip()
            if not t_raw:
                continue
            ts_ms = int(datetime.strptime(t_raw, TIME_FMT).timestamp() * 1000)
            val = parse_value(row.get(value_col))
            if val is None:
                continue
            points.append([ts_ms, val])
    if not points:
        raise SystemExit("No valid points")
    from_ms, to_ms = points[0][0], points[-1][0]
    meta = {
        "sensor": sensor,
        "metric": metric,
        "unit": "µg/m³",
        "chipId": CHIP_ID,
        "intervalMin": INTERVAL_MIN,
        "fromMs": from_ms,
        "toMs": to_ms,
    }
    series_path.write_text(
        json.dumps({"meta": meta, "points": points}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    summary_path.write_text(
        json.dumps(build_summary(points, meta, from_ms, to_ms), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"points={len(points)} series_bytes={series_path.stat().st_size}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
