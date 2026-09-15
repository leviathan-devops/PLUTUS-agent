import type { NodeFamily, NodeHandle } from "./types";
import { JeslError } from "./errors";

export interface NodeImpl {
  readonly kind: string;
  readonly family: NodeFamily;
  readonly requiredCaps?: ReadonlyArray<string>;
  readonly invoke: NodeHandle["invoke"];
}

export interface RegistryRow {
  readonly kind: string;
  readonly family: NodeFamily;
  readonly requiredCaps: ReadonlyArray<string>;
}

export class NodeRegistry {
  private impls = new Map<string, NodeImpl>();

  register(impl: NodeImpl): void {
    if (!impl.kind) throw new Error("NodeRegistry.register: missing kind");
    if (typeof impl.invoke !== "function") {
      throw new Error(`NodeRegistry.register: kind ${impl.kind} has no invoke function`);
    }
    const existing = this.impls.get(impl.kind);
    if (existing) {
      const sameFamily = existing.family === impl.family;
      const sameCaps = JSON.stringify(existing.requiredCaps ?? []) === JSON.stringify(impl.requiredCaps ?? []);
      const sameFn = existing.invoke === impl.invoke;
      if (sameFamily && sameCaps && sameFn) return;
      throw new JeslError({
        code: "[JESL UNKNOWN-NODE]",
        node: impl.kind,
        field: "registry",
        expected: "append-only: new kind or identical re-register",
        actual: `conflicting re-register of kind '${impl.kind}'`,
        remedy: "use a new kind name, or re-register the identical impl",
      });
    }
    this.impls.set(impl.kind, impl);
  }

  get(kind: string): NodeImpl | undefined {
    return this.impls.get(kind);
  }

  isKnownKind(kind: string): boolean {
    return this.impls.has(kind);
  }

  kinds(): ReadonlyArray<string> {
    return [...this.impls.keys()];
  }

  entries(): ReadonlyArray<RegistryRow> {
    return [...this.impls.values()].map((i) => ({
      kind: i.kind,
      family: i.family,
      requiredCaps: [...(i.requiredCaps ?? [])],
    }));
  }
}
