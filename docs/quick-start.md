# 🚀 Quick Start Guide

## What You Got

Your boilerplate now includes everything you need to ship a production-ready SaaS:

### Backend ✅
- **JWT Authentication** - Login, logout, protected routes
- **Production Error Handling** - Sentry, breadcrumbs, logging
- **Enhanced Logging** - Request correlation, performance tracking
- **Utilities** - Date, validation, array helpers

### Frontend ✅
- **23 UI Components** - Tables, forms, modals, alerts, etc.
- **Design System** - Stripe-inspired, data-first design
- **Enhanced API Client** - Type-safe, auto 401 handling
- **Layout Components** - PageLayout, PageHeader, etc.

---

## Get Started in 3 Steps

### 1. Setup Environment

#### Option A: Automated Setup (Recommended)

Run the setup script to automatically configure your environment:

```bash
./setup-boilerplate.sh
```

This will:
- Copy `.env.example` to `.env`
- Generate secure `JWT_SECRET` (64 characters)
- Generate secure `ADMIN_AUTH_KEY` (48 characters)
- Prompt for your app name and update `RP_NAME`
- Optionally update package.json and code references

#### Option B: Manual Setup

```bash
# Copy environment file
cp .env.example .env

# Edit .env and set these (IMPORTANT):
# JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
# ADMIN_AUTH_KEY=your-admin-auth-key
# DATABASE_URL=your-database-url
```

> ⚠️ **Security Note**: Always use strong, randomly generated secrets in production!
> You can generate secure secrets with: `openssl rand -base64 48 | tr -d '/+=' | cut -c1-64`

### 2. Install & Generate

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate

# Push database schema
pnpm prisma db push
```

### 3. Start Development

```bash
# Start dev server
pnpm dev

# Server runs on http://localhost:3000
```

---

## Create Your First User

```bash
# Create a user (admin endpoint)
curl -X POST http://localhost:3000/api/v1/auth/users \
  -H "Content-Type: application/json" \
  -H "X-Admin-Auth: your-admin-key" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## Build Your First Page

Create a new page using the built-in components:

```tsx
// client/src/pages/MyPage.tsx
import { PageLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export function MyPage() {
  return (
    <PageLayout
      title="My Page"
      description="This is my first page"
      actions={<Button>New Item</Button>}
    >
      <Card>
        <CardHeader>
          <CardTitle>Data Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>John Doe</TableCell>
                <TableCell>john@example.com</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
```

---

## Use the Auth System

Update your login page to use JWT:

```tsx
// client/src/pages/Login.tsx
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      // Redirect on success
      window.location.href = "/dashboard";
    } catch (error) {
      // Error is handled by the store
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-medium">Login</h1>
        
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

Check auth on app load:

```tsx
// client/src/App.tsx
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";

export function App() {
  const { checkAuth, hasCheckedAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!hasCheckedAuth) {
    return <div>Loading...</div>;
  }

  return (
    // Your app routes
  );
}
```

---

## Create an API Endpoint

Add a new protected endpoint:

```typescript
// server/src/routes/myfeature.routes.ts
import { Router } from "express";
import { jwtAuthMiddleware } from "@/middlewares/jwt-auth.middleware";
import { asyncHandler } from "@/core/async-handler";
import { ResponseHandler } from "@/core/response-handler";

const router = Router();

router.get(
  "/",
  jwtAuthMiddleware,
  asyncHandler(async (req, res) => {
    // req.user contains the authenticated user
    const data = { message: "Hello from protected route!" };
    return ResponseHandler.success(res, data);
  })
);

export default router;
```

Register the route:

```typescript
// server/src/routes/index.ts
import myFeatureRoutes from "@/routes/myfeature.routes";

router.use("/myfeature", myFeatureRoutes);
```

---

## Use the Enhanced API Client

```typescript
// In your React component
import { apiClient } from "@/lib/api";

// Generic GET request
const data = await apiClient.get<MyType>("/todos");

// Generic POST request
const newItem = await apiClient.post<MyType>("/todos", { title: "New Todo" });

// Generic PUT request
const updated = await apiClient.put<MyType>("/todos/1", { completed: true });

// Generic DELETE request
await apiClient.delete("/todos/1");
```

---

## Available Components

### Layout
- `PageLayout` - Complete page wrapper
- `PageHeader` - Page title & actions
- `PageContainer` - Max-width container
- `Section` - Content sections

### UI Components
- `Button` - 6 variants
- `Badge` - 7 variants
- `Card` - Card layouts
- `Table` - Data tables
- `Form` - React Hook Form integration
- `Input`, `Textarea`, `Select` - Form inputs
- `Checkbox`, `Switch` - Toggles
- `Dialog`, `Sheet` - Modals & drawers
- `Tabs` - Tab navigation
- `Alert` - Status messages
- `Breadcrumb` - Navigation
- `Pagination` - Page navigation
- `Progress` - Progress bars
- `Popover`, `Dropdown Menu` - Menus
- `Separator` - Visual dividers
- `LoadingSpinner`, `LoadingSkeleton` - Loading states
- `EmptyState`, `ErrorState` - Empty & error states

---

## Useful Utilities

```typescript
// Date utilities
import { 
  formatDisplayDate, 
  formatRelativeTime, 
  addDays, 
  startOfMonth 
} from "@/lib/utils";

formatDisplayDate(new Date()); // "Jan 1, 2024"
formatRelativeTime(new Date()); // "2 hours ago"

// Currency formatting
import { formatCurrency } from "@/lib/utils";
formatCurrency(1234.56); // "$1,234.56"

// File size formatting
import { formatBytes } from "@/lib/utils";
formatBytes(1024); // "1 KB"

// Truncate text
import { truncate } from "@/lib/utils";
truncate("Long text here", 10); // "Long text..."

// Get initials
import { getInitials } from "@/lib/utils";
getInitials("John Doe"); // "JD"

// Debounce
import { debounce } from "@/lib/utils";
const debouncedFn = debounce(() => console.log("Called!"), 300);
```

---

## Design System

Use the built-in design tokens for consistent styling:

```typescript
import { 
  pageLayout, 
  typography, 
  statusColors,
  iconSizes 
} from "@/lib/utils";

// Use in your components
<div className={pageLayout.container}>
  <h1 className={typography.h1}>Title</h1>
  <p className={typography.body}>Body text</p>
</div>
```

---

## Production Checklist

Before deploying to production:

- [ ] Run `./setup-boilerplate.sh` to generate secure secrets (or manually set):
  - [ ] Change `JWT_SECRET` to a strong random value (min 32 chars)
  - [ ] Change `ADMIN_AUTH_KEY` to a strong random value
- [ ] Set `DATABASE_URL` to your production database
- [ ] Set `SENTRY_DSN` for error tracking (optional)
- [ ] Update `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD`
- [ ] Set `NODE_ENV=production`
- [ ] Review and update CORS settings if needed
- [ ] Test auth endpoints
- [ ] Run `pnpm build` to verify build succeeds
- [ ] Run `pnpm test` to verify tests pass

---

## Common Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Run production build

# Database
pnpm prisma studio    # Open Prisma Studio
pnpm prisma generate  # Generate Prisma client
pnpm prisma db push   # Push schema to database

# Code Quality
pnpm lint             # Lint code
pnpm format           # Format code
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
```

---

## Need Help?

- **Full Documentation**: See `BOILERPLATE_ENHANCEMENTS.md`
- **Component Examples**: Check existing pages in `client/src/pages/`
- **API Examples**: Check existing routes in `server/src/routes/`

---

**Ready to ship!** 🚀

Your boilerplate is production-ready with:
- ✅ JWT Authentication
- ✅ 23 UI Components
- ✅ Error Handling & Logging
- ✅ Type-Safe API Client
- ✅ Design System

Start building your SaaS today!
