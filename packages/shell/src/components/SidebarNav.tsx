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
import { CommandPalette } from "./CommandPalette";

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

/**
 * Collapsible left sidebar — Cursor/dub.sh style.
 *
 * Layout: a compact header row (logo + toggle + search), a primary nav, a
 * flexible scroll region, and a user footer. On desktop the width animates
 * between `w-64` (expanded) and `w-16` (icon rail) over 150ms; labels fade
 * and clip via `overflow-hidden`. On mobile it slides in as an overlay drawer.
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
          "fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden border-r border-border bg-card",
          // Mobile: fixed width, slide via translate.
          "w-64 transition-transform duration-150 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible, animate width between rail and full.
          "lg:translate-x-0 lg:transition-[width] lg:duration-150 lg:ease-in-out",
          collapsed ? "lg:w-16" : "lg:w-64",
        )}
      >
        {/* Header: logo + (toggle / search). */}
        <div className="flex h-12 shrink-0 items-center justify-between gap-1 px-2">
          <Link
            to="/"
            onClick={() => onOpenChange(false)}
            className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 text-sm font-semibold tracking-tight transition-opacity hover:opacity-80"
          >
            <span className="flex size-5 shrink-0 items-center justify-center text-primary">
              <LayoutDashboard className="size-5" />
            </span>
            <span
              className={cn(
                "truncate transition-opacity duration-150",
                collapsed ? "lg:opacity-0 lg:invisible" : "opacity-100",
              )}
            >
              Groot
            </span>
          </Link>

          {/* Expanded: search field + collapse toggle. Collapsed: just search icon. */}
          <div className={cn("flex items-center gap-0.5", collapsed ? "lg:hidden" : "flex")}>
            <div className="hidden lg:block lg:w-40">
              <CommandPalette />
            </div>
            <button
              type="button"
              onClick={() => onCollapsedChange(true)}
              aria-label="Collapse sidebar"
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </div>

          {/* Collapsed-rail: search icon button (expand on click). */}
          <button
            type="button"
            onClick={() => onCollapsedChange(false)}
            aria-label="Expand sidebar"
            className={cn(
              "hidden size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              collapsed ? "lg:inline-flex" : "lg:hidden",
            )}
          >
            <PanelLeft className="size-4" />
          </button>
        </div>

        {/* Primary nav. */}
        <nav className="flex flex-col gap-px px-2 pb-1">
          {items.map((item) => {
            const Icon = ICONS[item.icon] ?? LayoutDashboard;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => onOpenChange(false)}
                title={collapsed ? item.name : undefined}
                className={cn(
                  "group flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors",
                  collapsed && "lg:justify-center",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-3.5 shrink-0",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <span
                  className={cn(
                    "truncate transition-opacity duration-150",
                    collapsed ? "lg:w-0 lg:opacity-0 lg:overflow-hidden" : "opacity-100",
                  )}
                >
                  {item.name}
                </span>
                {!collapsed && item.badge}
              </Link>
            );
          })}
        </nav>

        {/* Footer (user menu). */}
        {footer && <div className="mt-auto shrink-0 border-t border-border p-2">{footer}</div>}
      </aside>
    </>
  );
}
