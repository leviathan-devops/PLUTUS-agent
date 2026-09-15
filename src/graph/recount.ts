import { openGraph } from "./client.js";
import { CANON } from "./types.js";

function printResult(): void {
  let client;
  try {
    client = openGraph();
  } catch (error) {
    console.error(`GRAPH_RECOUNT_ABORT: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }
  let result;
  try {
    result = client.recount();
  } catch (error) {
    console.error(`GRAPH_RECOUNT_FAILED: ${error instanceof Error ? error.message : String(error)}`);
    client.close();
    process.exit(2);
  }
  console.log(`KG RECOUNT — live vs canon (canon fingerprint ${CANON.fingerprint})`);
  console.log(`db: ${client.dbPath}`);
  for (const v of result.verdicts) {
    console.log(`${v.verdict} ${v.key}: live=${v.live} canon=${v.canon}`);
  }
  console.log(`info findings_ledger_rows=${result.findings}`);
  for (const b of result.batteryVersions) {
    console.log(`info battery_version count=${b.count} version=${b.version}`);
  }
  console.log(`info tables: ${result.tables.join(",")}`);
  const drift = result.verdicts.filter((v) => v.verdict === "DRIFT");
  if (drift.length > 0) {
    console.log(`DRIFT finding: ${drift.map((d) => d.key).join(",")} differ from canon — honest drift, not a failure`);
  } else {
    console.log("ALL MATCH — live graph equals canon");
  }
  client.close();
}

printResult();
