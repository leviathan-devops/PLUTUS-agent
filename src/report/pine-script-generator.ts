/**
 * Pine Script v6 Generator — TTE v5.3.3 Section 10
 *
 * Generates a TradingView indicator from verified report data following the
 * 15-section Pine v6 template and PG1-PG10 generation rules.
 *
 * Rules enforced:
 *   PG1  All pair data sourced from verified report inputs only.
 *   PG2  NO mathematical conversion code (no DXY formula, no K factor).
 *   PG3  Timestamps correct for the data week.
 *   PG4  Zones ordered top-to-bottom (RESISTANCE at top).
 *   PG5  Info table = 2 cols x 17 rows.
 *   PG6  max_boxes_count=2000, max_labels_count=2000, max_lines_count=2000.
 *   PG7  `var` keyword for all data arrays.
 *   PG8  No abbreviations (e.g. "MODERATE-HEAVY" spelled out).
 *   PG9  S/D zones NOT emitted — only IP zones, LSZ, option strikes.
 *   PG10 Each pair's drawing block is independent.
 *
 * No `any` type. Strongly-typed per Trident Engineering Bible P2.
 */

import {
  PINE_VERSION, PINE_MAX_BOXES_COUNT, PINE_MAX_LABELS_COUNT, PINE_MAX_LINES_COUNT,
  PINE_FILL_OPACITY, PINE_BORDER_OPACITY, PINE_TABLE_COLS, PINE_TABLE_ROWS,
  PINE_TABLE_CELL_COUNT, PINE_TABLE_BG_OPACITY, PINE_TABLE_BORDER_WIDTH,
  PINE_TABLE_FRAME_WIDTH, PINE_BOX_BORDER_WIDTH, PINE_LINE_WIDTH,
  PINE_TS_DAYS_BEFORE, PINE_TS_DAYS_AFTER, PINE_NOON_HOUR,
  PINE_PRICE_SANITY_THRESHOLD, PINE_OPTION_PROXIMITY,
  PINE_LSZ_WIDTH_MIN_RATIO, PINE_LSZ_WIDTH_MAX_RATIO,
  PINE_DXY_REF_RANGE, PINE_EURUSD_REF_RANGE, PINE_GBPUSD_REF_RANGE,
  PINE_AUDUSD_REF_RANGE, PINE_ZFP_MULTIPLIER,
  PINE_AMBER_RGB, PINE_LSZ_STD_RGB, PINE_LSZ_ACT_RGB,
  PINE_RED_STOPS, PINE_BLUE_STOPS, PINE_GREEN_STOPS,
  PINE_FORMULA_REMNANTS, PINE_MIN_ZONES_FOR_SANITY,
} from '../constants/trading-constants.js';

// ─── Data Interfaces ──────────────────────────────────────────────────────────

export interface PineScriptData {
  weekLabel: string; // e.g. "Apr27-May1"
  dataWeekStart: { year: number; month: number; day: number };
  dataWeekEnd: { year: number; month: number; day: number };
  pairs: PinePairData[];
}

export interface PinePairData {
  pair: 'DXY' | 'EUR/USD' | 'GBP/USD' | 'AUD/USD';
  zones: PineZone[];
  lsz: PineLSZ[];
  options: PineOption[];
  trades: PineTrade[];
  shapeChain: string;
  shapeConfidence: number;
  altChain: string;
  altConfidence: number;
  dayByDay: string;
}

export interface PineZone {
  top: number;
  bottom: number;
  category: 'RES' | 'MID' | 'SUP';
  degree: 'EXTREME' | 'HEAVY' | 'MODERATE-HEAVY' | 'MODERATE' | 'LIGHT' | 'MINIMAL';
  tier: 'T1' | 'T2';
  name: string;
  zfp: number;
}

export interface PineLSZ {
  top: number;
  bottom: number;
  priority: 'ACTIVE' | 'STANDARD';
}

export interface PineOption {
  price: number;
  volume: string; // e.g. "1.2bn"
}

export interface PineTrade {
  entry1: number;
  entry3: number;
  sl: number;
  tp: number;
  rr: number;
  tier: string;
  dayEntry: string;
  dayTarget: string;
}

// ─── Static Constants ─────────────────────────────────────────────────────────

const PAIR_SUFFIX: Record<PinePairData['pair'], string> = {
  DXY: 'DXY',
  'EUR/USD': 'EU',
  'GBP/USD': 'GU',
  'AUD/USD': 'AU',
};

const PAIR_FLAG: Record<PinePairData['pair'], string> = {
  DXY: 'isDXY',
  'EUR/USD': 'isEU',
  'GBP/USD': 'isGU',
  'AUD/USD': 'isAU',
};

const PAIR_LABEL: Record<PinePairData['pair'], string> = {
  DXY: 'DXY',
  'EUR/USD': 'EUR/USD',
  'GBP/USD': 'GBP/USD',
  'AUD/USD': 'AUD/USD',
};

/** DXY conversion formula constants that must NEVER appear in output (PG2). */
const FORMULA_REMNANTS = PINE_FORMULA_REMNANTS;

/**
 * Pressure Ladder color gradients — index 0 = EXTREME (dark), 5 = MINIMAL (light).
 * RED for resistance (R1/R2), BLUE for equilibrium (EQ), GREEN for support (D1/D2).
 */
const RED_STOPS = PINE_RED_STOPS;
const BLUE_STOPS = PINE_BLUE_STOPS;
const GREEN_STOPS = PINE_GREEN_STOPS;

const AMBER_RGB = PINE_AMBER_RGB;
const LSZ_STD_RGB = PINE_LSZ_STD_RGB;
const LSZ_ACT_RGB = PINE_LSZ_ACT_RGB;

// ─── Generator ────────────────────────────────────────────────────────────────

export class PineScriptGenerator {
  /** Generate the full 15-section Pine v6 indicator string. */
  generate(data: PineScriptData): string {
    const out: string[] = [];
    out.push(this.buildHeader(data)); // Section 1
    out.push(this.buildIndicatorDecl(data)); // Section 2
    out.push(this.buildInputs()); // Section 3
    out.push(this.buildTimestamps(data)); // Section 4
    out.push(this.buildColorDefs()); // Section 5
    out.push(this.buildColorHelpers()); // Section 6
    out.push(this.buildLszColors()); // Section 7
    out.push(this.buildPairDetection()); // Section 8
    data.pairs.forEach((pair: PinePairData, i: number) => out.push(this.buildPairData(pair, i + 9))); // Sections 9-12
    out.push(this.buildHelpers()); // Section 13
    data.pairs.forEach((pair: PinePairData) => out.push(this.buildDrawingBlock(pair, data))); // Section 14
    out.push(this.buildNoFallback()); // Section 15
    return out.join('\n\n') + '\n';
  }

  // ── Section Builders ────────────────────────────────────────────────────────

  private buildHeader(data: PineScriptData): string {
    return [
      `//@version=${PINE_VERSION}`,
      '// =========================================================================',
      '// PLUTUS WEEKLY ZONES - Pine Script v6',
      `// Week: ${data.weekLabel}`,
      '// Generated by Plutus PineScriptGenerator (TTE v5.3.3 Sec. 10)',
      '// PG1-PG10 enforced. All data from verified report sources only.',
      '// =========================================================================',
    ].join('\n');
  }

  private buildIndicatorDecl(data: PineScriptData): string {
    return (
      `indicator("Plutus Weekly Zones - ${data.weekLabel}", shorttitle="PLUTUS", ` +
      `overlay=true, max_boxes_count=${PINE_MAX_BOXES_COUNT}, max_labels_count=${PINE_MAX_LABELS_COUNT}, max_lines_count=${PINE_MAX_LINES_COUNT})`
    );
  }

  private buildInputs(): string {
    return [
      '// === Section 3: Input Toggles ===',
      'showIP      = input.bool(true, "Show IP Zones")',
      'showLSZ     = input.bool(true, "Show LSZ")',
      'showOptions = input.bool(true, "Show Option Strikes")',
      'showTable   = input.bool(true, "Show Info Table")',
    ].join('\n');
  }

  private buildTimestamps(data: PineScriptData): string {
    const s = data.dataWeekStart;
    const e = data.dataWeekEnd;
    const tsL = this.shiftDays(s.year, s.month, s.day, PINE_TS_DAYS_BEFORE);
    const tsR = this.shiftDays(e.year, e.month, e.day, PINE_TS_DAYS_AFTER);
    const tsMid = this.midDate(s.year, s.month, s.day, e.year, e.month, e.day);
    return [
      '// === Section 4: Zone Date Range Timestamps ===',
      `int tsL   = timestamp(${tsL.year}, ${tsL.month}, ${tsL.day}, 0, 0) // 2 weeks before week start`,
      `int tsR   = timestamp(${tsR.year}, ${tsR.month}, ${tsR.day}, 0, 0) // 3 weeks after week end`,
      `int tsMid = timestamp(${tsMid.year}, ${tsMid.month}, ${tsMid.day}, 0, 0) // week midpoint`,
    ].join('\n');
  }

  private buildColorDefs(): string {
    return [
      '// === Section 5: Color Definitions (Pressure Ladder) ===',
      '// Resistance (RES) = RED gradient: EXTREME(180,40,30) -> MINIMAL(240,160,90) — R1, R2',
      '// Equilibrium (MID) = BLUE gradient: EXTREME(30,80,200) -> MINIMAL(130,180,250) — EQ',
      '// Support (SUP) = GREEN gradient: EXTREME(20,130,40) -> MINIMAL(100,205,100) — D1, D2',
      '// Fills = color.new(base, 70) [30% opacity]; borders = color.new(base, 0) [100% opacity]',
      `color cOption = color.new(color.rgb(${AMBER_RGB[0]}, ${AMBER_RGB[1]}, ${AMBER_RGB[2]}), ${PINE_FILL_OPACITY})`,
    ].join('\n');
  }

  private buildColorHelpers(): string {
    const lines: string[] = ['// === Section 6: Color Helper Functions ==='];
    const diExpr =
      'int di = deg == "EXTREME" ? 0 : deg == "HEAVY" ? 1 : deg == "MODERATE-HEAVY" ? 2 : deg == "MODERATE" ? 3 : deg == "LIGHT" ? 4 : 5';
    // zfill — 30% opacity fills
    lines.push('zfill(string cat, string deg) =>');
    lines.push(`    ${diExpr}`);
    lines.push(
      `    cat == "RES" ? ${this.colorChain(RED_STOPS, PINE_FILL_OPACITY)} : cat == "MID" ? ${this.colorChain(
        BLUE_STOPS,
        PINE_FILL_OPACITY,
      )} : ${this.colorChain(GREEN_STOPS, PINE_FILL_OPACITY)}`,
    );
    // zbord — 100% opacity borders
    lines.push('zbord(string cat, string deg) =>');
    lines.push(`    ${diExpr}`);
    lines.push(
      `    cat == "RES" ? ${this.colorChain(RED_STOPS, PINE_BORDER_OPACITY)} : cat == "MID" ? ${this.colorChain(
        BLUE_STOPS,
        PINE_BORDER_OPACITY,
      )} : ${this.colorChain(GREEN_STOPS, PINE_BORDER_OPACITY)}`,
    );
    // pressureLbl
    lines.push(
      'pressureLbl(string cat) => cat == "RES" ? "RESISTANCE" : cat == "MID" ? "EQUILIBRIUM" : "SUPPORT"',
    );
    return lines.join('\n');
  }

  private buildLszColors(): string {
    return [
      '// === Section 7: LSZ Color Definitions ===',
      `color lszStdFill  = color.new(color.rgb(${LSZ_STD_RGB[0]}, ${LSZ_STD_RGB[1]}, ${LSZ_STD_RGB[2]}), ${PINE_FILL_OPACITY})`,
      `color lszStdBord  = color.new(color.rgb(${LSZ_STD_RGB[0]}, ${LSZ_STD_RGB[1]}, ${LSZ_STD_RGB[2]}), ${PINE_BORDER_OPACITY})`,
      `color lszActFill  = color.new(color.rgb(${LSZ_ACT_RGB[0]}, ${LSZ_ACT_RGB[1]}, ${LSZ_ACT_RGB[2]}), ${PINE_FILL_OPACITY})`,
      `color lszActBord  = color.new(color.rgb(${LSZ_ACT_RGB[0]}, ${LSZ_ACT_RGB[1]}, ${LSZ_ACT_RGB[2]}), ${PINE_BORDER_OPACITY})`,
      'lszFill(string pri) => pri == "ACTIVE" ? lszActFill : lszStdFill',
      'lszBord(string pri) => pri == "ACTIVE" ? lszActBord : lszStdBord',
    ].join('\n');
  }

  private buildPairDetection(): string {
    return [
      '// === Section 8: Pair Detection ===',
      'string ticker = str.upper(str.replace(syminfo.ticker, "/", ""))',
      'bool isDXY = ticker == "DXY" or ticker == "DX-Y.NYB" or str.contains(ticker, "DXY")',
      'bool isEU  = ticker == "EURUSD" or ticker == "EURUSD=X" or str.contains(ticker, "EURUSD")',
      'bool isGU  = ticker == "GBPUSD" or ticker == "GBPUSD=X" or str.contains(ticker, "GBPUSD")',
      'bool isAU  = ticker == "AUDUSD" or ticker == "AUDUSD=X" or str.contains(ticker, "AUDUSD")',
    ].join('\n');
  }

  /** Sections 9-12: one per pair. PG7 — `var` keyword for all data arrays. */
  private buildPairData(pair: PinePairData, section: number): string {
    const s = PAIR_SUFFIX[pair.pair];
    const L: string[] = [`// === Section ${section}: ${PAIR_LABEL[pair.pair]} Data Arrays ===`];
    L.push(`var float[] ipTop${s}  = array.new_float()`);
    L.push(`var float[] ipBot${s}  = array.new_float()`);
    L.push(`var string[] ipCat${s} = array.new_string()`);
    L.push(`var string[] ipDeg${s} = array.new_string()`);
    L.push(`var string[] ipNm${s}  = array.new_string()`);
    L.push(`var float[] lszTop${s} = array.new_float()`);
    L.push(`var float[] lszBot${s} = array.new_float()`);
    L.push(`var string[] lszPri${s} = array.new_string()`);
    L.push(`var float[] optPx${s}  = array.new_float()`);
    L.push(`var string[] optVol${s} = array.new_string()`);
    L.push('if barstate.isfirst');
    for (const z of pair.zones) {
      L.push(`    array.push(ipTop${s}, ${this.num(z.top)})`);
      L.push(`    array.push(ipBot${s}, ${this.num(z.bottom)})`);
      L.push(`    array.push(ipCat${s}, "${z.category}")`);
      L.push(`    array.push(ipDeg${s}, "${z.degree}")`);
      L.push(`    array.push(ipNm${s}, "${this.escape(z.name)}")`);
    }
    for (const l of pair.lsz) {
      L.push(`    array.push(lszTop${s}, ${this.num(l.top)})`);
      L.push(`    array.push(lszBot${s}, ${this.num(l.bottom)})`);
      L.push(`    array.push(lszPri${s}, "${l.priority}")`);
    }
    for (const o of pair.options) {
      L.push(`    array.push(optPx${s}, ${this.num(o.price)})`);
      L.push(`    array.push(optVol${s}, "${this.escape(o.volume)}")`);
    }
    return L.join('\n');
  }

  private buildHelpers(): string {
    return [
      '// === Section 13: Helper Functions ===',
      'volLbl(string v) => str.format("{0} OI", v)',
      'calcZFP(float tp, float bt, string pair) =>',
      '    float zoneW = tp - bt',
      `    float refRange = pair == "DXY" ? ${PINE_DXY_REF_RANGE} : pair == "EUR/USD" ? ${PINE_EURUSD_REF_RANGE} : pair == "GBP/USD" ? ${PINE_GBPUSD_REF_RANGE} : ${PINE_AUDUSD_REF_RANGE}`,
      `    math.round(zoneW / refRange * ${PINE_ZFP_MULTIPLIER})`,
    ].join('\n');
  }

  /** Section 14: IP zones -> LSZ -> Options -> Table. PG10 — independent per pair. */
  private buildDrawingBlock(pair: PinePairData, data: PineScriptData): string {
    const s = PAIR_SUFFIX[pair.pair];
    const flag = PAIR_FLAG[pair.pair];
    const L: string[] = [`// === Section 14: ${PAIR_LABEL[pair.pair]} Drawing Block ===`];
    L.push(`var bool drawn${s} = false`);
    L.push(`if ${flag} and barstate.islast and not drawn${s}`);
    // IP zones
    L.push(`    if showIP`);
    L.push(`        int ni = array.size(ipTop${s})`);
    L.push(`        if ni > 0`);
    L.push(`            for i = 0 to ni - 1 by 1`);
    L.push(`                float t  = array.get(ipTop${s}, i)`);
    L.push(`                float b  = array.get(ipBot${s}, i)`);
    L.push(`                string c = array.get(ipCat${s}, i)`);
    L.push(`                string d = array.get(ipDeg${s}, i)`);
    L.push(`                string nm = array.get(ipNm${s}, i)`);
    L.push(
      `                box.new(left=tsL, top=t, right=tsR, bottom=b, xloc=xloc.bar_time, border_color=zbord(c, d), border_width=${PINE_BOX_BORDER_WIDTH}, bgcolor=zfill(c, d), text=nm, text_size=size.tiny, text_color=color.white)`,
    );
    // LSZ
    L.push(`    if showLSZ`);
    L.push(`        int nl = array.size(lszTop${s})`);
    L.push(`        if nl > 0`);
    L.push(`            for i = 0 to nl - 1 by 1`);
    L.push(`                float t = array.get(lszTop${s}, i)`);
    L.push(`                float b = array.get(lszBot${s}, i)`);
    L.push(`                string p = array.get(lszPri${s}, i)`);
    L.push(
      `                box.new(left=tsL, top=t, right=tsR, bottom=b, xloc=xloc.bar_time, border_color=lszBord(p), border_width=${PINE_BOX_BORDER_WIDTH}, bgcolor=lszFill(p), text_size=size.tiny)`,
    );
    // Option strikes
    L.push(`    if showOptions`);
    L.push(`        int no = array.size(optPx${s})`);
    L.push(`        if no > 0`);
    L.push(`            for i = 0 to no - 1 by 1`);
    L.push(`                float px = array.get(optPx${s}, i)`);
    L.push(`                string v = array.get(optVol${s}, i)`);
    L.push(
      `                line.new(x1=tsL, y1=px, x2=tsR, y2=px, xloc=xloc.bar_time, color=color.new(color.rgb(255, 200, 60), 0), width=${PINE_LINE_WIDTH}, style=line.style_dashed)`,
    );
    L.push(
      `                label.new(x=tsMid, y=px, xloc=xloc.bar_time, text=volLbl(v), style=label.style_label_left, color=cOption, textcolor=color.white, size=size.tiny)`,
    );
    // Info table (PG5: 2 cols x 17 rows)
    L.push(`    if showTable`);
    L.push(this.buildTable(pair, data));
    L.push(`    drawn${s} := true`);
    return L.join('\n');
  }

  private buildTable(pair: PinePairData, data: PineScriptData): string {
    const t = pair.trades.length > 0 ? pair.trades[0] : undefined;
    const rows: ReadonlyArray<readonly [string, string]> = [
      ['WEEK', data.weekLabel],
      ['PAIR', PAIR_LABEL[pair.pair]],
      ['SHAPE', pair.shapeChain],
      ['CONF', String(pair.shapeConfidence)],
      ['ALT', pair.altChain],
      ['ALT CONF', String(pair.altConfidence)],
      ['DAILY', pair.dayByDay],
      ['TIER', t ? t.tier : '-'],
      ['ENTRY 1', t ? this.num(t.entry1) : '-'],
      ['ENTRY 3', t ? this.num(t.entry3) : '-'],
      ['SL', t ? this.num(t.sl) : '-'],
      ['TP', t ? this.num(t.tp) : '-'],
      ['RR', t ? String(t.rr) : '-'],
      ['DAY IN', t ? t.dayEntry : '-'],
      ['DAY TGT', t ? t.dayTarget : '-'],
      ['ZONES', String(pair.zones.length)],
      ['LSZ', String(pair.lsz.length)],
    ];
    const L: string[] = [
      `        table tbl = table.new(position.top_right, ${PINE_TABLE_COLS}, ${PINE_TABLE_ROWS}, bgcolor=color.new(color.black, ${PINE_TABLE_BG_OPACITY}), frame_color=color.gray, frame_width=${PINE_TABLE_FRAME_WIDTH}, border_width=${PINE_TABLE_BORDER_WIDTH})`,
    ];
    for (let r = 0; r < rows.length; r++) {
      const cell = rows[r];
      L.push(`        table.cell(tbl, 0, ${r}, "${this.escape(cell[0])}", text_color=color.gray, text_size=size.tiny)`);
      L.push(`        table.cell(tbl, 1, ${r}, "${this.escape(cell[1])}", text_color=color.white, text_size=size.tiny)`);
    }
    return L.join('\n');
  }

  private buildNoFallback(): string {
    return [
      '// === Section 15: No Fallback for Unknown Tickers ===',
      '// Unrecognized symbols render nothing. No default or fallback zones are emitted.',
    ].join('\n');
  }

  // ── Verification (8-point) ──────────────────────────────────────────────────

  verify(
    code: string,
    data: PineScriptData,
  ): { passed: number; total: number; failures: string[]; evidence: string } {
    const failures: string[] = [];
    const checks: Array<{ name: string; ok: boolean }> = [
      { name: '1. Price Level Sanity (zones within 3% of median)', ok: this.checkPriceSanity(data) },
      { name: '2. Direction Consistency (RES above SUP)', ok: this.checkDirection(data) },
      { name: '3. No Formula Remnants', ok: this.checkNoFormula(code) },
      { name: '4. Zone Ordering (top-to-bottom)', ok: this.checkZoneOrder(data) },
      { name: '5. LSZ Consistency (width vs IP)', ok: this.checkLsz(data) },
      { name: '6. Option Strike Proximity (within 0.5%)', ok: this.checkOptions(data) },
      { name: '7. Table Completeness (17 rows)', ok: this.checkTable(code) },
      { name: '8. Timestamp Validity (tsL/tsR)', ok: this.checkTimestamps(code, data) },
    ];
    for (const c of checks) {
      if (c.ok) continue;
      failures.push(`${c.name} FAILED`);
    }
    return {
      passed: checks.length - failures.length,
      total: checks.length,
      failures,
      evidence: `${checks.length - failures.length}/${checks.length} checks passed${failures.length > 0 ? ` — failed: ${failures.join('; ')}` : ' — all checks passed'}`,
    };
  }

  private checkPriceSanity(data: PineScriptData): boolean {
    for (const pair of data.pairs) {
      if (pair.zones.length < PINE_MIN_ZONES_FOR_SANITY) continue;
      const mids = pair.zones.map((z: PineZone) => (z.top + z.bottom) / 2).sort((a: number, b: number) => a - b);
      const median = mids[Math.floor(mids.length / 2)]!;
      if (median === 0) return false;
      for (const z of pair.zones) {
        const mid = (z.top + z.bottom) / 2;
        if (Math.abs(mid - median) / median > PINE_PRICE_SANITY_THRESHOLD) return false;
      }
    }
    return true;
  }

  private checkDirection(data: PineScriptData): boolean {
    for (const pair of data.pairs) {
      const res = pair.zones.filter((z: PineZone) => z.category === 'RES').map((z: PineZone) => (z.top + z.bottom) / 2);
      const sup = pair.zones.filter((z: PineZone) => z.category === 'SUP').map((z: PineZone) => (z.top + z.bottom) / 2);
      if (res.length === 0 || sup.length === 0) continue;
      if (Math.max(...res) < Math.max(...sup)) return false;
    }
    return true;
  }

  private checkNoFormula(code: string): boolean {
    return !FORMULA_REMNANTS.some((f: string) => code.includes(f));
  }

  private checkZoneOrder(data: PineScriptData): boolean {
    for (const pair of data.pairs) {
      for (let i = 1; i < pair.zones.length; i++) {
        if (pair.zones[i]!.top > pair.zones[i - 1]!.top) return false;
      }
    }
    return true;
  }

  private checkLsz(data: PineScriptData): boolean {
    for (const pair of data.pairs) {
      if (pair.zones.length === 0 || pair.lsz.length === 0) continue;
      const ipW = pair.zones.map((z: PineZone) => Math.abs(z.top - z.bottom)).sort((a: number, b: number) => a - b);
      const med = ipW[Math.floor(ipW.length / 2)]!;
      if (med === 0) continue;
      for (const l of pair.lsz) {
        const w = Math.abs(l.top - l.bottom);
        if (w < med * PINE_LSZ_WIDTH_MIN_RATIO || w > med * PINE_LSZ_WIDTH_MAX_RATIO) return false;
      }
    }
    return true;
  }

  private checkOptions(data: PineScriptData): boolean {
    for (const pair of data.pairs) {
      if (pair.zones.length === 0) continue;
      for (const o of pair.options) {
        if (o.price === 0) return false;
        let near = false;
        for (const z of pair.zones) {
          const dist = Math.min(Math.abs(o.price - z.top), Math.abs(o.price - z.bottom));
          if (dist / o.price <= PINE_OPTION_PROXIMITY) {
            near = true;
            break;
          }
        }
        if (!near) return false;
      }
    }
    return true;
  }

  private checkTable(code: string): boolean {
    const cells = (code.match(/table\.cell\(/g) || []).length;
    return cells >= PINE_TABLE_CELL_COUNT && code.includes(`table.new(position.top_right, ${PINE_TABLE_COLS}, ${PINE_TABLE_ROWS}`);
  }

  private checkTimestamps(code: string, data: PineScriptData): boolean {
    const s = data.dataWeekStart;
    const e = data.dataWeekEnd;
    const tsL = this.shiftDays(s.year, s.month, s.day, PINE_TS_DAYS_BEFORE);
    const tsR = this.shiftDays(e.year, e.month, e.day, PINE_TS_DAYS_AFTER);
    const lOk = code.includes(`timestamp(${tsL.year}, ${tsL.month}, ${tsL.day}, 0, 0)`);
    const rOk = code.includes(`timestamp(${tsR.year}, ${tsR.month}, ${tsR.day}, 0, 0)`);
    return lOk && rOk;
  }

  // ── Low-level Utilities ─────────────────────────────────────────────────────

  /** Build a Pine ternary color chain from gradient stops. */
  private colorChain(stops: ReadonlyArray<readonly [number, number, number]>, trans: number): string {
    const parts: string[] = [];
    for (let i = 0; i < stops.length; i++) {
      const c = stops[i]!;
      const expr = `color.new(color.rgb(${c[0]}, ${c[1]}, ${c[2]}), ${trans})`;
      parts.push(i < stops.length - 1 ? `di == ${i} ? ${expr}` : expr);
    }
    return parts.join(' : ');
  }

  private num(n: number): string {
    return String(n);
  }

  private escape(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private shiftDays(
    year: number,
    month: number,
    day: number,
    delta: number,
  ): { year: number; month: number; day: number } {
    const d = new Date(year, month - 1, day, PINE_NOON_HOUR, 0, 0, 0);
    d.setDate(d.getDate() + delta);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }

  private midDate(
    sy: number,
    sm: number,
    sd: number,
    ey: number,
    em: number,
    ed: number,
  ): { year: number; month: number; day: number } {
    const s = new Date(sy, sm - 1, sd, PINE_NOON_HOUR, 0, 0, 0);
    const e = new Date(ey, em - 1, ed, PINE_NOON_HOUR, 0, 0, 0);
    const mid = new Date((s.getTime() + e.getTime()) / 2);
    return { year: mid.getFullYear(), month: mid.getMonth() + 1, day: mid.getDate() };
  }
}
