import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  LayoutDashboard,
  CheckSquare,
  HardDrive,
  Briefcase,
  LogOut,
  Search,
} from "lucide-react";
import { useAuthStore } from "@groot/shell/store/auth";
import { useCommandPaletteStore } from "@groot/shell/store/command-palette";
import { Dialog, DialogContent, DialogTitle } from "@groot/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@groot/ui/command";

/** Button that opens the shared command palette dialog. */
export function CommandPaletteTrigger({ iconOnly = false }: { iconOnly?: boolean }) {
  const setOpen = useCommandPaletteStore((state) => state.setOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Search (⌘K)"
      className={
        iconOnly
          ? "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          : "inline-flex items-center justify-between whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground px-4 py-2 relative h-8 w-full justify-start rounded-[0.5rem] bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
      }
    >
      {iconOnly ? (
        <Search className="size-4" />
      ) : (
        <>
          <span className="hidden lg:inline-flex">Search...</span>
          <span className="inline-flex lg:hidden">Search...</span>
          <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">Cmd</span>K
          </kbd>
        </>
      )}
    </button>
  );
}

/** The actual command palette dialog — render this once at the app root. */
export function CommandPaletteDialog() {
  const open = useCommandPaletteStore((state) => state.open);
  const setOpen = useCommandPaletteStore((state) => state.setOpen);
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false);
      command();
    },
    [setOpen],
  );

  const handleLogout = () => {
    runCommand(() => {
      logout();
      navigate("/login");
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl [&>button]:hidden">
        <DialogTitle className="sr-only">Command Menu</DialogTitle>
        <Command className="[&_[cmdk-input-wrapper]]:border-b-0">
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigation">
              <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                <LayoutDashboard />
                <span>Dashboard</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/todos"))}>
                <CheckSquare />
                <span>Todos</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/storage"))}>
                <HardDrive />
                <span>Storage</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/jobs"))}>
                <Briefcase />
                <span>Jobs</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
                <Settings />
                <span>Settings</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Account">
              <CommandItem
                onSelect={handleLogout}
                className="text-destructive data-[selected=true]:text-destructive"
              >
                <LogOut />
                <span>Logout</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use `CommandPaletteTrigger` for the button and `CommandPaletteDialog` for the dialog. */
export function CommandPalette({ iconOnly = false }: { iconOnly?: boolean }) {
  return (
    <>
      <CommandPaletteTrigger iconOnly={iconOnly} />
      <CommandPaletteDialog />
    </>
  );
}
