import * as React from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  type DefaultValues,
  type FieldValues,
  type FieldPath,
  type Resolver,
  type SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { cn } from "./lib/utils";
import { Label } from "./label";

interface FormProps<TValues extends FieldValues> extends Omit<
  React.ComponentProps<"form">,
  "onSubmit"
> {
  /** Zod schema driving validation + the inferred value type. */
  schema: z.ZodType<TValues>;
  defaultValues: TValues;
  onSubmit: (values: TValues) => void | Promise<void>;
}

/**
 * Schema-driven form. Owns a react-hook-form instance bound to a Zod schema:
 *
 *   <Form schema={loginSchema} defaultValues={{ email: "", password: "" }}
 *         onSubmit={(values) => login(values)}>
 *     <FormField name="email" label="Email"><Input /></FormField>
 *     <FormField name="password" label="Password"><Input type="password" /></FormField>
 *     <Button type="submit">Log in</Button>
 *   </Form>
 *
 * Pass any Zod schema (e.g. one mirroring a server validation schema) — the
 * inferred value type flows through to `onSubmit`.
 */
function FormRoot<TValues extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  className,
  ...props
}: FormProps<TValues>) {
  const form = useForm<TValues>({
    // zodResolver's overloads don't line up with a caller-supplied generic
    // value type, so cast through `never` + `unknown` — the schema's output
    // IS `TValues`, which useForm then binds throughout.
    resolver: zodResolver(schema as never) as unknown as Resolver<TValues>,
    defaultValues: defaultValues as DefaultValues<TValues>,
  });
  return (
    <FormProvider {...form}>
      <form
        {...props}
        className={className}
        onSubmit={form.handleSubmit(onSubmit as SubmitHandler<TValues>)}
      />
    </FormProvider>
  );
}

interface FormFieldProps<TValues extends FieldValues> {
  /** Typed field path — invalid names are caught at compile time. */
  name: FieldPath<TValues>;
  label?: string;
  /** Help text shown directly under the label, above the input. */
  description?: React.ReactNode;
  /** Hint shown below the input (e.g. an example or format note). */
  hint?: React.ReactNode;
  className?: string;
  /** A single controlled input (Input/Textarea/Select). Bound automatically. */
  children: React.ReactElement;
}

/**
 * A labeled field that auto-binds its child input to the form (label, value,
 * change handling, and the validation error message). The child receives the
 * react-hook-form `field` props via clone — no manual `register`/`Controller`
 * wiring needed for the common single-input case.
 *
 * Generic over the form's values: leave untyped for a plain string name, or
 * annotate as `<FormField<MyValues> name="...">` to validate the field path.
 */
function FormField<TValues extends FieldValues = FieldValues>({
  name,
  label,
  description,
  hint,
  className,
  children,
}: FormFieldProps<TValues>) {
  const { control } = useFormContext<TValues>();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className={cn("space-y-1.5", className)}>
          {label && (
            <Label htmlFor={name} className="text-sm font-medium">
              {label}
            </Label>
          )}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          {/* The field binding is merged onto the child input via cloneElement;
              the prop set varies across Input/Textarea/Select, hence the cast. */}
          {React.cloneElement(
            children,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { ...field, id: name, "aria-invalid": fieldState.invalid } as any,
          )}
          {fieldState.error ? (
            <p className="text-xs text-destructive">{fieldState.error.message}</p>
          ) : (
            hint && <p className="text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
      )}
    />
  );
}

export { FormRoot as Form, FormField };

interface FieldProps {
  label?: React.ReactNode;
  description?: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Presentational label + content wrapper for fields that manage their own
 * state (e.g. dialogs that don't use react-hook-form). Mirrors `FormField`'s
 * spacing so forms look consistent whether or not they're schema-driven.
 */
function Field({ label, description, hint, htmlFor, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
      )}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export { Field };
