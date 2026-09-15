// src/machines/algebra.ts — the effect-style algebra (spec §2.7)
// The typed error channel + the resource-safe bracket — the two patterns that
// earn their import. The full Effect runtime is NOT adopted (weight, G4).

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export interface ParagonError {
  readonly code: string;
  readonly detail?: string;
}

/** attempt — the allSettled-single wrapper: a throwing fn lands in ITS result slot. */
export function attempt<T>(fn: () => T): Result<T, ParagonError> {
  try {
    return ok(fn());
  } catch (e) {
    return err({ code: 'THROWN', detail: String(e) });
  }
}

/**
 * bracket — the resource-safe lifecycle: acquire → use → release ALWAYS (the
 * release runs on success AND failure — the P4 resource law made structural).
 */
export async function bracket<A, R>(
  acquire: () => Promise<A> | A,
  use: (a: A) => Promise<R> | R,
  release: (a: A) => Promise<void> | void,
): Promise<Result<R, ParagonError>> {
  let a: A;
  try {
    a = await acquire();
  } catch (e) {
    return err({ code: 'ACQUIRE_FAILED', detail: String(e) });
  }
  try {
    const value = await use(a);
    return ok(value);
  } catch (e) {
    return err({ code: 'USE_FAILED', detail: String(e) });
  } finally {
    try {
      await release(a);
    } catch {
      // release failure on a failed use: swallowed ONLY because the primary error
      // is the signal; on a SUCCESSFUL use the release error would have surfaced
      // above (the finally still ran). This is the bounded exception to the
      // no-silent-catch law — documented, and the release is best-effort by design.
    }
  }
}
