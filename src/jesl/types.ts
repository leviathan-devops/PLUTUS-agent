export type Verdict = "PASS" | "FAIL" | "INCONCLUSIVE" | "READY_FALSE";
export type NodeKind =
  | "detect" | "decide" | "generate" | "generate-sink"
  | "gate" | "shell-exec" | "math-eval" | "journal-sink";
export type NodeFamily = "detect" | "decide" | "generate" | "gate" | "math" | "effect";

export interface Triplet {
  readonly pattern: string;
  readonly state: string;
  readonly anchor: string;
}

export interface NodeEnvelope {
  readonly id: string;
  readonly type: string;
  readonly config?: Record<string, unknown>;
  readonly caps?: ReadonlyArray<string>;
  readonly retries?: { readonly maxRetries?: number };
}

export interface EdgeDecl {
  readonly from: string;
  readonly to: string;
  readonly via: string;
}

export interface WorkflowDoc {
  readonly $schema: "trident-workflow-v1";
  readonly meta: { readonly name: string; readonly tier: 1 | 2; readonly description?: string };
  readonly nodes: ReadonlyArray<NodeEnvelope>;
  readonly edges: ReadonlyArray<EdgeDecl>;
  readonly vars?: Record<string, unknown>;
}

export interface NodeResult {
  readonly verdict: Verdict;
  readonly outputs?: Record<string, unknown>;
  readonly error?: unknown;
  readonly evidence: Triplet;
  readonly timing: { readonly startMs: number; readonly endMs: number };
  readonly attempts?: number;
}

export interface NodeInput {
  readonly node: NodeEnvelope;
  readonly inbound: Record<string, unknown>;
}

export interface FsDriver {
  readonly read: (p: string) => Promise<string> | string;
  readonly write: (p: string, body: string) => Promise<void> | void;
}

/** Structural view of the Journal a node may commit through (satisfied by journal.Journal). */
export interface JournalSink {
  readonly append: (draft: {
    readonly run: string;
    readonly node: string;
    readonly kind: JournalRow["kind"];
    readonly verdict?: Verdict;
    readonly evidence?: Triplet;
    readonly source: string;
  }) => JournalRow;
}

export interface NodeHandle {
  readonly invoke: (input: NodeInput, ctx: RunDriverCtx) => Promise<NodeResult> | NodeResult;
  readonly requiredCaps?: ReadonlyArray<string>;
}

export interface RunDriverCtx {
  readonly runId: string;
  readonly doc: WorkflowDoc;
  readonly fs?: FsDriver;
  readonly journal?: JournalSink;
  readonly boundCaps: ReadonlySet<string>;
  readonly vars: Record<string, unknown>;
}

export interface JournalRow {
  readonly seq: number;
  readonly ts: number;
  readonly run: string;
  readonly node: string;
  readonly kind: "invoke" | "verdict" | "summary";
  readonly verdict?: Verdict;
  readonly evidence?: Triplet;
  readonly source: string;
  readonly prev: string;
  readonly self: string;
}

export interface RunSummary {
  readonly runId: string;
  readonly verdict: Verdict;
  readonly overall: boolean;
  readonly invoked: number;
  readonly results: Record<string, NodeResult>;
  readonly batches: ReadonlyArray<ReadonlyArray<string>>;
  readonly rows: ReadonlyArray<JournalRow>;
}
