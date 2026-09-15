/**
 * PLUTUS 4.0 Pipeline — Merkle Evidence Chain
 *
 * Every pipeline artifact must be tamper-evident. The Merkle chain links
 * each phase's output to the previous phase's hash. Any modification to
 * a phase output invalidates all downstream hashes.
 *
 * INTEGRATION: NEW FILE src/pipeline/merkle-chain.ts
 * Source: L2 Spec Section 10.3
 */

import { createHash } from 'node:crypto';

/**
 * MerkleNode BECAUSE every pipeline artifact must be tamper-evident. The
 * Merkle chain links each phase's output to the previous phase's hash.
 * Any modification to a phase output invalidates all downstream hashes.
 */
export interface MerkleNode {
  phase: string;
  hash: string;
  parentHash: string;
  payloadHash: string;
  timestamp: number;
}

/**
 * computeMerkleNode BECAUSE the chain must be computed deterministically.
 * The hash covers: phase name, parent hash, payload JSON, timestamp.
 *
 * INTEGRATION: invoked at the end of each tool body. The node is
 * appended to /root/plutus/reports/merkle-chain.json.
 */
export function computeMerkleNode(
  phase: string,
  parent: MerkleNode | null,
  payload: unknown,
): MerkleNode {
  const payloadJson = JSON.stringify(payload, Object.keys(payload ?? {}).sort());
  const payloadHash = createHash('sha256').update(payloadJson).digest('hex');
  const parentHash = parent?.hash ?? '0'.repeat(64);
  const timestamp = Date.now();
  const composite = `${phase}:${parentHash}:${payloadHash}:${timestamp}`;
  const hash = createHash('sha256').update(composite).digest('hex');
  return { phase, hash, parentHash, payloadHash, timestamp };
}
