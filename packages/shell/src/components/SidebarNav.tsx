import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@groot/ui/lib/utils";
import {
  CheckSquare,
  HardDrive,
  Briefcase,
  Settings as SettingsIcon,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeft,
  type LucideIcon,
} from "lucide-react";
import { Tooltip } from "@groot/ui/tooltip";

export type NavIcon = "dashboard" | "check-square" | "hard-drive" | "briefcase" | "settings";

export interface NavItem {
  name: string;
  href: string;
  icon: NavIcon;
  exact?: boolean;
  badge?: ReactNode;
}

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  "check-square": CheckSquare,
  "hard-drive": HardDrive,
  briefcase: Briefcase,
  settings: SettingsIcon,
};

interface SidebarNavProps {
  items: NavItem[];
  pathname: string;
  /** Mobile drawer open state. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Desktop collapsed (icon-rail) state. */
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  footer?: ReactNode;
}

const ICON_BTN =
  "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

/**
 * Collapsible left sidebar.
 *
 * Two independent states:
 *  - `open` (mobile only): slides the drawer in/out as an overlay.
 *  - `collapsed` (desktop only): collapses to a minimal icon rail. Both the
 *    width and the main content padding animate over 300ms ease-in-out so they
 *    stay in sync.
 *
 * The render is unified: a single structure with responsive classes that hide
 * or show elements based on the current state. This eliminates the duplication
 * and drift that comes from two separate branches.
 */
export function SidebarNav({
  items,
  pathname,
  open,
  onOpenChange,
  collapsed,
  onCollapsedChange,
  footer,
}: SidebarNavProps) {
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {/* Mobile backdrop. */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => onOpenChange(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card",
          "w-[17.5rem] transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:transition-[width] lg:duration-300 lg:ease-in-out",
          collapsed ? "lg:w-16" : "lg:w-[17.5rem]",
        )}
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex h-14 shrink-0 items-center justify-between px-3">
          <Link
            to="/"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex items-center gap-2 text-sm font-semibold tracking-tight transition-opacity",
              collapsed && "lg:justify-center lg:gap-0",
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard className="size-4" />
            </span>
            <span className={cn("truncate", collapsed && "lg:hidden")}>Groot</span>
          </Link>

          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(ICON_BTN, "hidden lg:inline-flex")}
          >
            {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        {/* ── Nav items ─────────────────────────────────────────── */}
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {items.map((item) => {
            const Icon = ICONS[item.icon] ?? LayoutDashboard;
            const active = isActive(item);
            const link = (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "lg:justify-center lg:px-2 lg:py-2" : "px-3 py-2",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <span className={cn("flex-1 whitespace-nowrap", collapsed && "lg:hidden")}>
                  {item.name}
                </span>
                {item.badge && !collapsed && <span className="lg:hidden">{item.badge}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href} content={item.name}>
                  {link}
                </Tooltip>
              );
            }
            return link;
          })}
        </nav>

        {/* ── Footer ──────────────────────────────────────────── */}
        {footer && (
          <div className="shrink-0 border-t border-border p-3">
            <div className={cn("overflow-hidden", collapsed && "lg:px-0")}>{footer}</div>
          </div>
        )}
      </aside>
    </>
  );
}
