import { useNavigate } from "react-router-dom";
import { Button } from "@groot/ui/button";
import { Input } from "@groot/ui/input";
import { Form, FormField } from "@groot/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@groot/ui/card";
import { useAuthStore } from "@groot/shell/store/auth";
import { z } from "zod";
import { toast } from "sonner";

// Mirrors the server's loginSchema (packages/core/src/auth/auth.validation.ts).
// Duplicated locally so the client never imports the server package (which
// pulls Prisma/AWS/bcrypt) into the client bundle.
const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type LoginValues = z.infer<typeof loginSchema>;

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
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <Form
            schema={loginSchema}
            defaultValues={{ email: "", password: "" }}
            onSubmit={onSubmit}
            className="space-y-4"
          >
            <FormField name="email" label="Email">
              <Input type="email" autoComplete="username" />
            </FormField>
            <FormField name="password" label="Password">
              <Input type="password" autoComplete="current-password" />
            </FormField>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
