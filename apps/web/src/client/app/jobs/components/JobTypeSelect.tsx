import { Button } from "@groot/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@groot/ui/dropdown-menu";
import { Input } from "@groot/ui/input";
import type { JobName } from "@groot/client/types/jobs";
import { ChevronDown, Search } from "lucide-react";

type Props = {
  id: string;
  value: JobName | "";
  onChange: (value: JobName) => void;
  search: string;
  onSearchChange: (value: string) => void;
  availableJobs: string[];
};

/** Searchable job-type picker used by the Add-Job and Schedule-Job dialogs. */
export function JobTypeSelect({
  id,
  value,
  onChange,
  search,
  onSearchChange,
  availableJobs,
}: Props) {
  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) onSearchChange("");
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          id={id}
          className="w-full justify-between h-10 px-3 text-sm font-normal"
        >
          <span className={value ? "" : "text-muted-foreground"}>{value || "Select job type"}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
        <div className="px-2 pt-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search job types..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-7 h-7 text-xs border-0 bg-transparent focus-visible:ring-0"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[180px] overflow-y-auto">
          {availableJobs.map((job) =>
            job.toLowerCase().includes(search.toLowerCase()) ? (
              <DropdownMenuItem
                key={job}
                onSelect={() => onChange(job as JobName)}
                className="text-xs"
              >
                {job}
              </DropdownMenuItem>
            ) : null,
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
