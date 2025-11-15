import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";

export function Layout() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-semibold">
            Todo Boilerplate
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/todos"
              className={({ isActive }) =>
                `transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`
              }
            >
              Todos
            </NavLink>
            <NavLink
              to="/storage"
              className={({ isActive }) =>
                `transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`
              }
            >
              Storage
            </NavLink>
            <span className="text-muted-foreground">{user?.username}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
