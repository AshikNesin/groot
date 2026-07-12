import * as React from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  type DefaultValues,
  type FieldValues,
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
 * A server-side Zod validation schema can be passed straight in (single source
 * of truth) — see `@groot/core/<feature>/<feature>.validation`.
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

interface FormFieldProps {
  name: string;
  label?: string;
  className?: string;
  /** A single controlled input (Input/Textarea/Select). Bound automatically. */
  children: React.ReactElement;
}

/**
 * A labeled field that auto-binds its child input to the form (label, value,
 * change handling, and the validation error message). The child receives the
 * react-hook-form `field` props via clone — no manual `register`/`Controller`
 * wiring needed for the common single-input case.
 */
function FormField({ name, label, className, children }: FormFieldProps) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className={cn("space-y-2", className)}>
          {label && <Label htmlFor={name}>{label}</Label>}
          {/* The field binding is merged onto the child input via cloneElement;
              the prop set varies across Input/Textarea/Select, hence the cast. */}
          {React.cloneElement(
            children,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { ...field, id: name, "aria-invalid": fieldState.invalid } as any,
          )}
          {fieldState.error && (
            <p className="text-sm text-destructive">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
}

export { FormRoot as Form, FormField };
