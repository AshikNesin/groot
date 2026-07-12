import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type ToastContent = string | { title: string; description?: string };

function emitToast(content: ToastContent, kind: "success" | "error"): void {
  if (typeof content === "string") {
    toast[kind](content);
  } else {
    toast[kind](content.title, { description: content.description });
  }
}

interface ToastMutationConfig<TData, TVars> {
  /** Shown on success. Pass a function for a result-dependent message. */
  success?: ToastContent | ((data: TData, vars: TVars) => ToastContent);
  /** Shown on error (the error is always `console.error`-logged too). */
  error?: ToastContent;
  /** Runs after a successful mutation, e.g. invalidate queries or reset UI. */
  onSuccess?: (data: TData, vars: TVars) => void | Promise<void>;
}

/**
 * `useMutation` + toast wiring in one call. Collapses the repeated
 *   try { await fn(); toast.success(...) } catch (e) { console.error(e); toast.error(...) }
 * boilerplate. `mutateAsync` still rejects on error, so callers awaiting it
 * can run post-success code in a `try` with an empty catch.
 *
 * The `onSuccess` callback is awaited, so a returned invalidation Promise
 * keeps `isPending`/`mutateAsync` in sync with the refetch.
 */
export function useToastMutation<TData, TVars>(
  mutationFn: (vars: TVars) => Promise<TData>,
  config: ToastMutationConfig<TData, TVars> = {},
) {
  return useMutation<TData, Error, TVars>({
    mutationFn,
    onSuccess: async (data, vars) => {
      if (config.success) {
        const content =
          typeof config.success === "function" ? config.success(data, vars) : config.success;
        emitToast(content, "success");
      }
      await config.onSuccess?.(data, vars);
    },
    onError: (error) => {
      console.error(error);
      if (config.error) emitToast(config.error, "error");
    },
  });
}
