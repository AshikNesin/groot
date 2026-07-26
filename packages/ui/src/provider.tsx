import type { ReactNode } from "react";
import { ConfirmProvider } from "./primitives/confirm";
import { Toaster } from "./sonner";

/**
 * Single root provider for `@groot/ui`'s cross-cutting primitives.
 *
 * Mount this once near the top of the app tree (above any component that uses
 * `useConfirm()` or relies on toast notifications):
 *
 *   import { GrootUIProvider } from "@groot/ui";
 *   <GrootUIProvider>{children}</GrootUIProvider>
 *
 * It composes the individual providers currently exported by this package so
 * consumers don't need to know which (or how many) must be mounted — today that
 * is {@link ConfirmProvider} plus the {@link Toaster}. New cross-cutting UI
 * providers added later should be wired in here rather than surfaced
 * individually to app authors.
 */
export function GrootUIProvider({ children }: { children: ReactNode }) {
  return (
    <ConfirmProvider>
      {children}
      <Toaster />
    </ConfirmProvider>
  );
}
