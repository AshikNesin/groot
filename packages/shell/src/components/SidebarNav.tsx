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

const ICON_BTN =
  "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

/**
 * Collapsible left sidebar.
 *
 * Two independent states:
 *  - `open` (mobile only): slides the drawer in/out as an overlay.
 *  - `collapsed` (desktop only): collapses to a minimal icon rail — the expand
 *    toggle and centered nav icons only. Brand text, labels, and the footer
 *    are hidden. Both the width and the main content padding animate over
 *    300ms ease-in-out so they stay in sync.
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
          "w-56 transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible, animate width between rail and full.
          "lg:translate-x-0 lg:transition-[width] lg:duration-300 lg:ease-in-out",
          collapsed ? "lg:w-16" : "lg:w-56",
        )}
      >
        {/* Collapsed rail: expand toggle + centered nav icons only. */}
        {collapsed ? (
          <>
            <div className="flex h-14 shrink-0 items-center justify-center px-3 lg:flex">
              <button
                type="button"
                onClick={() => onCollapsedChange(false)}
                aria-label="Expand sidebar"
                className={ICON_BTN}
              >
                <PanelLeft className="size-4" />
              </button>
            </div>
            <nav className="flex flex-col items-center gap-1 px-2 py-2">
              {items.map((item) => {
                const Icon = ICONS[item.icon] ?? LayoutDashboard;
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => onOpenChange(false)}
                    title={item.name}
                    aria-label={item.name}
                    className={cn(
                      "group flex size-9 items-center justify-center rounded-lg transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        active
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                  </Link>
                );
              })}
            </nav>
          </>
        ) : (
          <>
            {/* Expanded header: brand on the left, collapse + search on the right. */}
            <div className="flex h-14 shrink-0 items-center justify-between gap-1 px-3">
              <Link
                to="/"
                onClick={() => onOpenChange(false)}
                className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <LayoutDashboard className="size-4" />
                </span>
                <span className="truncate transition-opacity duration-200">Groot</span>
              </Link>

              <div className="flex items-center gap-0.5">
                <CommandPalette iconOnly />
                <button
                  type="button"
                  onClick={() => onCollapsedChange(true)}
                  aria-label="Collapse sidebar"
                  className={ICON_BTN}
                >
                  <PanelLeftClose className="size-4" />
                </button>
              </div>
            </div>

            {/* Nav. */}
            <nav className="flex-1 space-y-1 px-3 py-2">
              {items.map((item) => {
                const Icon = ICONS[item.icon] ?? LayoutDashboard;
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        active
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    <span className="flex-1 whitespace-nowrap">{item.name}</span>
                    {item.badge}
                  </Link>
                );
              })}
            </nav>

            {/* Footer (user menu). */}
            {footer && <div className="shrink-0 border-t border-border p-3">{footer}</div>}
          </>
        )}
      </aside>
    </>
  );
}
