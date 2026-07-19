import { useNavigate } from "react-router-dom";
import { Button } from "@groot/ui/button";
import { Input } from "@groot/ui/input";
import { Form, FormField } from "@groot/ui/form";
import { useAuthStore } from "@groot/shell/store/auth";
import { z } from "zod";
import { toast } from "sonner";
import { LayoutDashboard, ShieldCheck, Zap, ArrowRight } from "lucide-react";

const isDev = import.meta.env.DEV;

const DEMO_CREDENTIALS = { email: "demo@example.com", password: "demo@example.com" };

// Mirrors the server's loginSchema (packages/core/src/auth/auth.validation.ts).
// Duplicated locally so the client never imports the server package (which
// pulls Prisma/AWS/bcrypt) into the client bundle.
const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type LoginValues = z.infer<typeof loginSchema>;

const FEATURES = [
  { icon: Zap, title: "Built for speed", desc: "Express + React with HMR out of the box." },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    desc: "JWT + Passkey auth, S3 storage, audit logs.",
  },
  { icon: LayoutDashboard, title: "Production UI", desc: "A polished sidebar shell you can ship." },
];

export function Login() {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const onSubmit = async (values: LoginValues) => {
    try {
      await login(values.email, values.password);
      navigate("/");
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Login Failed", {
        description: error instanceof Error ? error.message : "Invalid credentials",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left: form. */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard className="size-5" />
            </span>
            <span className="text-base font-semibold tracking-tight">Groot</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account to continue.</p>

          {isDev && (
            <div className="mt-6 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Demo credentials</span> —
              demo@example.com / demo@example.com
            </div>
          )}

          <Form
            schema={loginSchema}
            defaultValues={isDev ? DEMO_CREDENTIALS : { email: "", password: "" }}
            onSubmit={onSubmit}
            className="mt-6 space-y-4"
          >
            <FormField name="email" label="Email">
              <Input type="email" autoComplete="username" placeholder="you@example.com" />
            </FormField>
            <FormField name="password" label="Password">
              <Input type="password" autoComplete="current-password" placeholder="••••••••" />
            </FormField>
            <Button type="submit" size="lg" className="w-full">
              Sign In
              <ArrowRight className="size-4" />
            </Button>
          </Form>
        </div>
      </div>

      {/* Right: brand panel. */}
      <div className="relative hidden overflow-hidden bg-primary lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:px-16">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative max-w-md text-primary-foreground">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            The boilerplate that ships like a product.
          </h2>
          <p className="mt-3 text-sm text-primary-foreground/70">
            Everything you need to launch a full-stack SaaS — auth, storage, background jobs, and a
            polished UI — without the busywork.
          </p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <f.icon className="size-4 text-primary-foreground" />
                </span>
                <div>
                  <p className="text-sm font-medium text-primary-foreground">{f.title}</p>
                  <p className="text-sm text-primary-foreground/60">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
