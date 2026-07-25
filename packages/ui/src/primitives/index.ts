/**
 * Composed primitives — Radix-backed building blocks (ports of shadcn
 * components) that are NOT direct re-exports of the Radix surface. Import via
 *
 *   import { AlertDialog } from "@groot/ui/primitives";
 *
 * so it is explicit that these are composed/styled, not raw Radix.
 */
export * from "./alert-dialog";
export { ConfirmProvider, useConfirm, type ConfirmOptions } from "./confirm";
