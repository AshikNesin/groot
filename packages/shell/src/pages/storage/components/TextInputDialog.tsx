import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@groot/ui/dialog";
import { Button } from "@groot/ui/button";
import { Form, FormField } from "@groot/ui/form";
import { Input } from "@groot/ui/input";
import { z } from "zod";
import type { ReactNode } from "react";

const schema = z.object({ value: z.string().min(1, "Name is required") });

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  label: string;
  placeholder?: string;
  /** Seed value (e.g. current name when renaming). */
  initialValue?: string;
  submitLabel: string;
  /** Verb shown while the mutation is pending, e.g. "Creating…". */
  pendingLabel: string;
  pending: boolean;
  onSubmit: (value: string) => void;
  /** Optional hint rendered under the field (e.g. the current file name). */
  hint?: ReactNode;
};

/**
 * Modal with a single required text input — the shape behind "create folder"
 * and "rename" in the storage page. Owns its own field state.
 */
export function TextInputDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  initialValue,
  submitLabel,
  pendingLabel,
  pending,
  onSubmit,
  hint,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form
          schema={schema}
          defaultValues={{ value: initialValue ?? "" }}
          onSubmit={({ value }) => onSubmit(value)}
          className="space-y-4"
        >
          <FormField name="value" label={label}>
            <Input placeholder={placeholder} />
          </FormField>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? pendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
