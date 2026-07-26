"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { AlertTriangle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Imperative confirmation dialog — a thin convenience layer over the
 * {@link AlertDialog} primitive (shadcn alert-dialog / Radix AlertDialog). It
 * exposes a promise-returning `confirm()` so callers can replace
 * `window.confirm()` without restructuring async handlers:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete job?", destructive: true }))) return;
 *
 * Semantics follow Radix AlertDialog: the dialog can ONLY be closed by the
 * action/cancel buttons or Escape (not by clicking the overlay), so a
 * confirmation can never be dismissed accidentally. The promise resolves
 * `true` on confirm, `false` on cancel/Escape. A later `confirm()` supersedes
 * an earlier, still-open one (resolving it `false`), so at most one is shown.
 */
export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  /** Label for the primary button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Renders the confirm button with the destructive variant and a warning icon. */
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

type State = { open: boolean; options: ConfirmOptions | null };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ open: false, options: null });
  // Ref so the promise resolves even as React batches the open→false
  // transition, and so a superseding confirm() resolves its predecessor.
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      // Resolve any still-open confirmation as cancelled before replacing it.
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setState({ open: true, options });
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    // Keep `options` while closing so the AlertDialog animates out with its
    // content intact (Radix unmounts content only after the exit animation).
    setState((prev) => ({ open: false, options: prev.options }));
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  // AlertDialog's onOpenChange fires for Escape (and only Escape, since overlay
  // clicks are blocked by the alert semantics). Escape == cancel.
  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog open={state.open} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {state.options?.destructive ? (
                <AlertTriangle className="size-4 text-destructive" />
              ) : null}
              {state.options?.title ?? "Confirm"}
            </AlertDialogTitle>
            {state.options?.description ? (
              <AlertDialogDescription>{state.options.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>
              {state.options?.cancelLabel ?? "Cancel"}
            </AlertDialogCancel>
            {/* AlertDialogAction auto-closes on click; settle(true) first. */}
            <AlertDialogAction
              variant={state.options?.destructive ? "destructive" : "default"}
              onClick={() => settle(true)}
            >
              {state.options?.confirmLabel ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

/**
 * Returns the imperative `confirm()` function backed by {@link ConfirmProvider}.
 * Must be called within a `ConfirmProvider` subtree.
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a <ConfirmProvider>");
  }
  return ctx;
}
