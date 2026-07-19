import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@groot/shell/store/auth";
import { CommandPalette } from "./CommandPalette";
import { SidebarNav, type NavItem } from "./SidebarNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@groot/ui/dropdown-menu";
import { Button } from "@groot/ui/button";
import { cn } from "@groot/ui/lib/utils";
import {
  ChevronsUpDown,
  LogOut,
  Settings as SettingsIcon,
  HardDrive,
  Briefcase,
  PanelLeftClose,
  PanelLeft,
  User as UserIcon,
} from "lucide-react";

const SIDEBAR_COLLAPSED_KEY = "groot.sidebar.collapsed";

export interface LayoutProps {
  /**
   * Custom header / nav. When omitted, the default shell sidebar renders
   * (logo + command palette + user menu). Pass your own to brand the app shell
   * without reimplementing the surrounding layout.
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
 * App shell: a dub.sh-style collapsible sidebar on the left, routed `<Outlet/>`
 * on the right. The sidebar collapses (desktop) into an icon rail with a
 * 300ms width animation; on mobile it slides in as an overlay drawer.
 */
export function Layout({ header, padded = true, mainClassName, className }: LayoutProps) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile drawer state.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop collapse state, persisted across reloads.
  const [collapsed, setCollapsed] = useState(false);

  const handleCollapsedChange = (next: boolean) => {
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  };

  // Hydrate the collapsed preference once on mount.
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems: NavItem[] = [{ name: "Todos", href: "/todos", icon: "check-square" }];

  return (
    <div className={cn("min-h-screen bg-muted/40 text-foreground", className)}>
      {header ?? (
        <SidebarNav
          items={navItems}
          pathname={location.pathname}
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          collapsed={collapsed}
          onCollapsedChange={handleCollapsedChange}
          footer={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent",
                    collapsed ? "lg:justify-center lg:px-1.5" : "",
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                    {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? (
                      <UserIcon className="size-4" />
                    )}
                  </span>

                  <span
                    className={cn(
                      "flex-1 min-w-0 leading-tight transition-opacity",
                      collapsed && "lg:hidden",
                    )}
                  >
                    <span className="block truncate text-sm font-medium">
                      {user?.name?.trim() ||
                        user?.email?.split("@")[0]?.replace(/^\w/, (c) => c.toUpperCase()) ||
                        "Account"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user?.name?.trim()
                        ? user?.email?.toLowerCase()
                        : (user?.email?.toLowerCase() ?? "")}
                    </span>
                  </span>

                  <ChevronsUpDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground",
                      collapsed && "lg:hidden",
                    )}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-52">
                <DropdownMenuItem onClick={() => navigate("/storage")}>
                  <HardDrive className="mr-2 h-4 w-4" />
                  <span>Storage</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/jobs")}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  <span>Jobs</span>
                </DropdownMenuItem>
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
          }
        />
      )}

      {/* Main column: sidebar offset on desktop (animated with the sidebar),
          full-width on mobile. */}
      <div
        className={cn(
          "transition-[padding] duration-300 ease-in-out",
          collapsed ? "lg:pl-16" : "lg:pl-[17.5rem]",
        )}
      >
        {/* Top bar — mobile (sidebar toggle + brand + search). */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <PanelLeftClose className="size-5" /> : <PanelLeft className="size-5" />}
          </Button>
          <Link to="/" className="text-sm font-semibold tracking-tight">
            Groot
          </Link>
          <div className="ml-auto w-full max-w-xs">
            <CommandPalette />
          </div>
        </header>

        {/* Desktop slim toolbar with command palette. */}
        <header className="hidden h-14 items-center justify-end gap-4 border-b border-border bg-background/60 px-6 lg:flex">
          <div className="w-full max-w-md">
            <CommandPalette />
          </div>
        </header>

        <main className={cn("w-full", padded && "px-4 pb-10 pt-6 sm:px-6 lg:px-8", mainClassName)}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
