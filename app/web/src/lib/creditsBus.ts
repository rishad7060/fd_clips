/**
 * Tiny in-app event bus for "the credit balance changed".
 *
 * The top-bar <CreditsChip/> lives in the persistent app shell, while the
 * balance is mutated on a different page (billing: purchase / cancel / confirm).
 * They share no React state, so the page emits here after it updates the balance
 * and the chip re-fetches - no full reload needed. Module-level (one bus per tab).
 */
type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribe to balance-change pings. Returns an unsubscribe function. */
export function onCreditsChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Notify subscribers that the credit balance / plan changed. */
export function emitCreditsChanged(): void {
  listeners.forEach((fn) => fn());
}
