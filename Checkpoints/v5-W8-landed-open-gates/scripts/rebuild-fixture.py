#!/usr/bin/env python3
"""scripts/rebuild-fixture.py — W1 GATE-CLASS gate 0: live-bars fixture verifier.

The canonical pipeline fixture lives OUTSIDE the repo at
$BARS_FIXTURE (default /tmp/opencode/bars_raw.json): a list of
{pair, timeframe, bars[], error?} slots. This script never fabricates bars;
--verify LOUDLY fails when the fixture is missing or corrupt, and warns (exit 0)
on known gap slots (15m/30m decision-window gaps) while the 1H core is present.

Usage:
  python3 scripts/rebuild-fixture.py --verify [--bars PATH]
"""
import argparse
import json
import os
import sys

DEFAULT_BARS = os.environ.get("BARS_FIXTURE", "/tmp/opencode/bars_raw.json")
REQUIRED_1H = [("DXY", "1H"), ("EUR/USD", "1H"), ("GBP/USD", "1H")]
BAR_FIELDS = ("timestamp", "open", "high", "low", "close")


def fail(msg, code):
    print(f"FIXTURE-VERIFY: FAIL — {msg}", file=sys.stderr)
    return code


def verify(path):
    if not os.path.isfile(path):
        return fail(
            f"fixture missing at {path} (set BARS_FIXTURE or re-harvest; "
            "W1 gate is script-existence, fixture may be absent)",
            2,
        )
    try:
        with open(path, "r", encoding="utf-8") as fh:
            doc = json.load(fh)
    except (OSError, json.JSONDecodeError) as e:
        return fail(f"fixture corrupt at {path}: {e}", 1)
    if not isinstance(doc, list) or not doc:
        return fail(f"fixture at {path} must be a non-empty list of slots", 1)

    total_bars = 0
    gaps = []
    slot_count = 0
    bad_bars = 0
    index = {}
    for slot in doc:
        if not isinstance(slot, dict):
            return fail("fixture slot is not an object", 1)
        pair, tf = slot.get("pair"), slot.get("timeframe")
        bars = slot.get("bars", [])
        slot_count += 1
        index[(pair, tf)] = len(bars) if isinstance(bars, list) else -1
        if not isinstance(bars, list):
            return fail(f"slot {pair} {tf}: 'bars' is not a list", 1)
        if not bars:
            gaps.append(f"{pair} {tf}: {str(slot.get('error'))[:100]}")
            continue
        for b in bars:
            if not isinstance(b, dict) or any(
                k not in b or not isinstance(b[k], (int, float)) for k in BAR_FIELDS
            ):
                bad_bars += 1
        total_bars += len(bars)

    if bad_bars:
        return fail(f"{bad_bars} bars fail OHLC-numeric shape {BAR_FIELDS}", 1)
    if total_bars == 0:
        return fail("fixture has zero bars in every slot", 1)
    missing_1h = [f"{p} {t}" for (p, t) in REQUIRED_1H if index.get((p, t), 0) <= 0]
    if missing_1h:
        return fail(f"required 1H core slots empty: {', '.join(missing_1h)}", 1)

    print(f"FIXTURE-VERIFY: PASS — {path}")
    print(f"  slots={slot_count} total_bars={total_bars}")
    for (p, t), n in sorted(index.items(), key=lambda kv: str(kv[0])):
        print(f"  slot {p} {t}: n={n}")
    if gaps:
        print(f"  WARNINGS ({len(gaps)} gap slots, recorded seams — core 1H intact):")
        for g in gaps:
            print(f"    GAP: {g}")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="W1 fixture verifier (gate 0)")
    ap.add_argument("--verify", action="store_true", required=True)
    ap.add_argument("--bars", default=DEFAULT_BARS)
    args = ap.parse_args(argv)
    return verify(args.bars)


if __name__ == "__main__":
    sys.exit(main())
