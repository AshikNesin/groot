import { Link, Outlet, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "@groot/shell/store/auth";
import { CommandPalette } from "./CommandPalette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@groot/ui/dropdown-menu";
import { Button } from "@groot/ui/button";
import { cn } from "@groot/ui/lib/utils";
import { UserCircle, LogOut, Settings as SettingsIcon } from "lucide-react";

export interface LayoutProps {
  /**
   * Custom header / nav. When omitted, the default shell header renders
   * (logo + command palette + user menu). Pass your own `<Navbar/>` to brand
   * the app shell without reimplementing the surrounding layout.
   */
  header?: ReactNode;
  /**
   * Whether `<main>` gets the shell's default horizontal + vertical padding.
   * Defaults to `true`. Set `false` when pages own their own padding (e.g. via
   * `PageContainer`).
   */
  padded?: boolean;
  /** Extra className merged onto `<main>` (e.g. `flex flex-col` for full-height pages). */
  mainClassName?: string;
  /** Extra className merged onto the outermost wrapper div. */
  className?: string;
}

/**
 * App shell: sticky header on top, routed `<Outlet/>` below. Apps can inject a
 * custom `header` (e.g. a finance `<Navbar/>`) and toggle main padding without
 * forking the whole layout.
 */
export function Layout({ header, padded = true, mainClassName, className }: LayoutProps) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={cn("min-h-screen bg-background text-foreground flex flex-col", className)}>
      {header ?? (
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 sticky top-0 w-full">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-sm font-semibold tracking-tight transition-colors hover:text-primary"
              >
                Groot
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-full sm:w-64">
                <CommandPalette />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                    <UserCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Account</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
      )}

      <main
        className={cn(
          "flex-1 w-full",
          padded && "px-4 sm:px-6 lg:px-8 py-8",
          mainClassName,
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
