import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { join } from "node:path";
import { openGraph } from "./client.js";
import type { GraphClient } from "./client.js";
import {
  GraphNoEmbeddingsError,
  GraphUnknownRuleError,
  GraphUnknownSymbolError,
} from "./types.js";

const DB = join(process.cwd(), ".trident/knowledge-graph/shared.db");

let client: GraphClient;
let raw: Database;

beforeAll(() => {
  client = openGraph(DB);
  raw = new Database(DB, { readonly: true });
});

afterAll(() => {
  client.close();
  raw.close();
});

describe("whoCalls", () => {
  test("known symbol returns typed caller records", () => {
    const callers = client.whoCalls("injectShapeSequence");
    expect(Array.isArray(callers)).toBe(true);
    for (const c of callers) {
      expect(typeof c.callerId).toBe("string");
      expect(typeof c.callerName).toBe("string");
      expect(c.edgeKind).toBe("calls");
    }
    const targets = raw
      .query("SELECT COUNT(*) AS n FROM graph_edges WHERE target_id LIKE '%::injectShapeSequence' AND kind = 'calls'")
      .get() as { n: number };
    expect(callers.length).toBe(targets.n);
  });
  test("unknown symbol returns empty array, not a throw", () => {
    expect(client.whoCalls("no_such_symbol_xyz_123")).toEqual([]);
  });
  test("empty symbol throws TypeError", () => {
    expect(() => client.whoCalls("")).toThrow(TypeError);
  });
  test("null symbol throws TypeError", () => {
    expect(() => client.whoCalls(null as unknown as string)).toThrow(TypeError);
  });
});

describe("chain", () => {
  test("live edge resolves to a 2-node path", () => {
    const edge = raw.query("SELECT source_id s, target_id t FROM graph_edges WHERE kind = 'calls' LIMIT 1").get() as {
      s: string;
      t: string;
    };
    const path = client.chain(edge.s, edge.t);
    expect(path).not.toBeNull();
    expect(path!.length).toBe(2);
    expect(path![0]!.id).toBe(edge.s);
    expect(path![1]!.id).toBe(edge.t);
  });
  test("self chain returns the single node", () => {
    const node = raw.query("SELECT id FROM graph_nodes WHERE kind = 'method' LIMIT 1").get() as { id: string };
    const path = client.chain(node.id, node.id);
    expect(path?.length).toBe(1);
  });
  test("unknown endpoint throws GraphUnknownSymbolError", () => {
    expect(() => client.chain("no_such_xyz", "injectShapeSequence")).toThrow(GraphUnknownSymbolError);
    expect(() => client.chain("injectShapeSequence", "no_such_xyz")).toThrow(GraphUnknownSymbolError);
  });
  test("depth boundary: 0 and 65 throw, 1 and 64 do not throw on depth grounds", () => {
    expect(() => client.chain("a", "b", 0)).toThrow(RangeError);
    expect(() => client.chain("a", "b", 65)).toThrow(RangeError);
    expect(() => client.chain("a", "b", 1.5)).toThrow(RangeError);
  });
  test("concurrent chain calls agree", async () => {
    const edge = raw.query("SELECT source_id s, target_id t FROM graph_edges WHERE kind = 'calls' LIMIT 1 OFFSET 7").get() as {
      s: string;
      t: string;
    };
    const results = await Promise.all([
      Promise.resolve(client.chain(edge.s, edge.t)),
      Promise.resolve(client.chain(edge.s, edge.t)),
      Promise.resolve(client.chain(edge.s, edge.t)),
    ]);
    for (const r of results) expect(r?.length).toBe(2);
  });
});

describe("violations", () => {
  test("default scope returns latest-run rows", () => {
    const rows = client.violations();
    expect(rows.length).toBeGreaterThan(0);
    const latest = client.latestRunId();
    for (const r of rows.slice(0, 20)) {
      expect(r.runId).toBe(latest);
      expect(typeof r.ruleId).toBe("string");
      expect(typeof r.file).toBe("string");
    }
  });
  test("severity filter only returns that severity", () => {
    const rows = client.violations({ severity: "CRIT", limit: 50 });
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.severity).toBe("CRIT");
  });
  test("unknown run returns empty array", () => {
    expect(client.violations({ runId: "run-that-never-existed" })).toEqual([]);
  });
  test("bad limit and bad runId throw", () => {
    expect(() => client.violations({ limit: 0 })).toThrow(RangeError);
    expect(() => client.violations({ runId: "" })).toThrow(TypeError);
  });
});

describe("consistency", () => {
  test("counts are computed from the data", () => {
    const rep = client.consistency();
    const n = (raw.query("SELECT COUNT(*) AS n FROM graph_nodes").get() as { n: number }).n;
    const e = (raw.query("SELECT COUNT(*) AS n FROM graph_edges").get() as { n: number }).n;
    expect(rep.nodeCount).toBe(n);
    expect(rep.edgeCount).toBe(e);
    expect(rep.nodeCount).toBeGreaterThan(0);
    expect(rep.danglingEdgeCount).toBe(0);
    expect(rep.latestRunId).toBe(client.latestRunId());
  });
});

describe("mustImplement", () => {
  test("every item carries its contract fields and honest verdict", () => {
    const items = client.mustImplement();
    expect(items.length).toBeGreaterThan(0);
    for (const it of items.slice(0, 30)) {
      expect(typeof it.predicateId).toBe("string");
      expect(typeof it.declaredInterface).toBe("string");
      expect(Array.isArray(it.requiredMembers)).toBe(true);
      expect(it.satisfied).toBe(it.missingMembers.length === 0);
    }
    const shapeBrain = items.find((i) => i.declaredInterface === "ShapeBrain");
    expect(shapeBrain).toBeDefined();
  });
});

describe("semanticSearch", () => {
  test("throws loud GRAPH_NO_EMBEDDINGS", () => {
    try {
      client.semanticSearch("cascade injection zones");
      throw new Error("SHOULD_HAVE_THROWN");
    } catch (error) {
      expect(error).toBeInstanceOf(GraphNoEmbeddingsError);
      expect((error as GraphNoEmbeddingsError).code).toBe("GRAPH_NO_EMBEDDINGS");
    }
  });
  test("empty query throws TypeError before the embeddings gate", () => {
    expect(() => client.semanticSearch("")).toThrow(TypeError);
  });
});

describe("rule", () => {
  test("numeric id returns the card", () => {
    const detail = client.rule(2);
    expect(detail.card).not.toBeNull();
    expect(detail.card!.id).toBe(2);
    expect(typeof detail.card!.quote).toBe("string");
  });
  test("predicate id returns predicate plus violations", () => {
    const pred = raw.query("SELECT id FROM compiled_predicates LIMIT 1").get() as { id: string };
    const detail = client.rule(pred.id);
    expect(detail.predicate).not.toBeNull();
    expect(detail.predicate!.id).toBe(pred.id);
    expect(Array.isArray(detail.violations)).toBe(true);
  });
  test("unknown id throws GraphUnknownRuleError", () => {
    expect(() => client.rule(999999999)).toThrow(GraphUnknownRuleError);
    expect(() => client.rule("no.such:predicate")).toThrow(GraphUnknownRuleError);
  });
});

describe("readonly discipline", () => {
  test("an INSERT through a readonly handle throws", () => {
    expect(() =>
      raw.exec("INSERT INTO findings (rule_id, severity, file, verdict, run_id) VALUES ('x','W','f','V','r')")
    ).toThrow(/readonly/i);
  });
  test("findings count unchanged after the write attempt", () => {
    const n = (raw.query("SELECT COUNT(*) AS n FROM findings").get() as { n: number }).n;
    expect(n).toBe(client.recount().findings);
  });
});
