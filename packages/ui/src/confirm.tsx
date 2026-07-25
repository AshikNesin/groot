"use client";

import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Imperative confirmation dialog — a styled replacement for `window.confirm()`.
 *
 * Mount {@link ConfirmProvider} once near the root of the app, then call
 * `confirm()` from any descendant:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete job?", destructive: true }))) return;
 *
 * The promise resolves `true` on confirm and `false` on cancel / outside click
 * / Escape. A single Dialog backs every call; a later `confirm()` supersedes
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

function ConfirmProvider({ children }: { children: ReactNode }) {
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
    // Keep `options` while closing so the Dialog animates out with its content
    // intact (Radix unmounts content only after the exit animation finishes).
    setState((prev) => ({ open: false, options: prev.options }));
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog open={state.open} onOpenChange={(open) => !open && settle(false)}>
        <DialogContent showCloseButton={false} dismissOnOutsideClick className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {state.options?.destructive ? (
                <AlertTriangle className="size-4 text-destructive" />
              ) : null}
              {state.options?.title ?? "Confirm"}
            </DialogTitle>
            {state.options?.description ? (
              <DialogDescription>{state.options.description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => settle(false)}>
              {state.options?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant={state.options?.destructive ? "destructive" : "default"}
              onClick={() => settle(true)}
            >
              {state.options?.confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

/**
 * Returns the imperative `confirm()` function backed by {@link ConfirmProvider}.
 * Must be called within a `ConfirmProvider` subtree.
 */
function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a <ConfirmProvider>");
  }
  return ctx;
}

export { ConfirmProvider, useConfirm };
export type { ConfirmOptions };
