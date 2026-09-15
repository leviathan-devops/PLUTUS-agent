import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { openGraph } from "./client.js";
import { CANON } from "./types.js";

const DB = join(process.cwd(), ".trident/knowledge-graph/shared.db");

describe("recount", () => {
  test("canon constants match the operator manual", () => {
    expect(CANON.nodes).toBe(1940);
    expect(CANON.edges).toBe(3647);
    expect(CANON.ruleCards).toBe(2837);
    expect(CANON.predicates).toBe(2837);
    expect(CANON.fingerprint).toBe("bc6ce1a0584a");
  });
  test("every canon key gets a MATCH/DRIFT verdict line", () => {
    const client = openGraph(DB);
    try {
      const result = client.recount();
      const keys = result.verdicts.map((v) => v.key).sort();
      expect(keys).toEqual(["compiled_predicates", "edges", "fingerprint", "nodes", "rule_cards"]);
      for (const v of result.verdicts) {
        expect(v.verdict === "MATCH" || v.verdict === "DRIFT").toBe(true);
        expect(typeof v.live).toBe("string");
        expect(typeof v.canon).toBe("string");
      }
      expect(result.tables).toContain("graph_nodes");
      expect(result.tables).toContain("graph_edges");
      expect(result.tables).toContain("rule_cards");
      expect(result.tables).toContain("compiled_predicates");
      expect(result.tables).toContain("findings");
      expect(result.batteryVersions.length).toBeGreaterThan(0);
    } finally {
      client.close();
    }
  });
  test("map values match canon, ledger drift is reported not hidden", () => {
    const client = openGraph(DB);
    try {
      const result = client.recount();
      const verdict = (key: string): string => result.verdicts.find((v) => v.key === key)!.verdict;
      expect(verdict("nodes")).toBe("MATCH");
      expect(verdict("edges")).toBe("MATCH");
      expect(verdict("fingerprint")).toBe("MATCH");
      expect(result.findings).toBeGreaterThan(0);
    } finally {
      client.close();
    }
  });
});
