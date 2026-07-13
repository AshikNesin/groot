import { Badge } from "@groot/ui/badge";
import { Button } from "@groot/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@groot/ui/dropdown-menu";
import { Input } from "@groot/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@groot/ui/tabs";
import {
  primaryOptions,
  secondaryOptions,
  type JobsQueryPatch,
  type StateTab,
} from "@groot/jobs/client/constants";
import { Calendar as CalendarIcon, Filter, MoreHorizontal, Search, X } from "lucide-react";

type QueryParams = {
  state: string;
  queue: string;
  search: string;
  datePreset: string;
};

type Props = {
  queryParams: QueryParams;
  setQueryParams: (patch: JobsQueryPatch) => void;
  activeSecondaryTab?: { value: StateTab; label: string };
  hasActiveFilters: boolean;
  availableJobs: string[];
  queueSearch: string;
  setQueueSearch: (value: string) => void;
  handlePresetChange: (value: string) => void;
  handleClearFilters: () => void;
};

/** State tabs + search + queue + date-preset filters for the jobs list. */
export function JobsFilters({
  queryParams,
  setQueryParams,
  activeSecondaryTab,
  hasActiveFilters,
  availableJobs,
  queueSearch,
  setQueueSearch,
  handlePresetChange,
  handleClearFilters,
}: Props) {
  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Tabs
          value={queryParams.state}
          onValueChange={(value) => setQueryParams({ state: value, page: 0 })}
        >
          <TabsList>
            {primaryOptions.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="text-xs">
                {option.label}
              </TabsTrigger>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`inline-flex h-full items-center justify-center whitespace-nowrap rounded-sm px-2 py-1 text-xs font-medium transition-all focus-visible:outline-none ${
                    activeSecondaryTab
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  {activeSecondaryTab ? (
                    <span className="max-w-[5rem] truncate">{activeSecondaryTab.label}</span>
                  ) : (
                    <MoreHorizontal className="w-4 h-4" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {secondaryOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => setQueryParams({ state: option.value, page: 0 })}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-40 lg:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={queryParams.search}
              onChange={(e) => setQueryParams({ search: e.target.value, page: 0 })}
              className="pl-8 h-8 text-xs"
            />
          </div>
          {availableJobs.length > 0 && (
            <DropdownMenu
              onOpenChange={(open) => {
                if (!open) setQueueSearch("");
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Filter className="w-3.5 h-3.5 md:mr-1.5" />
                  <span className="hidden md:inline max-w-[6rem] truncate">
                    {queryParams.queue !== "all" ? queryParams.queue : "Queue"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 pt-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <Input
                      placeholder="Search queues..."
                      value={queueSearch}
                      onChange={(e) => setQueueSearch(e.target.value)}
                      className="pl-7 h-7 text-xs border-0 bg-transparent focus-visible:ring-0"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-[200px] overflow-y-auto">
                  <DropdownMenuItem
                    onSelect={() => setQueryParams({ queue: "all", page: 0 })}
                    className="text-xs"
                  >
                    All Queues
                  </DropdownMenuItem>
                  {availableJobs.map((jobName) =>
                    jobName.toLowerCase().includes(queueSearch.toLowerCase()) ? (
                      <DropdownMenuItem
                        key={jobName}
                        onSelect={() => setQueryParams({ queue: jobName, page: 0 })}
                        className="text-xs"
                      >
                        {jobName}
                      </DropdownMenuItem>
                    ) : null,
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <CalendarIcon className="w-3.5 h-3.5 md:mr-1.5" />
                <span className="hidden md:inline">
                  {queryParams.datePreset !== "all"
                    ? queryParams.datePreset.replace(/-/g, " ")
                    : "Date"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handlePresetChange("today")}>
                Today
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handlePresetChange("last-7-days")}>
                Last 7 Days
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handlePresetChange("this-month")}>
                This Month
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handlePresetChange("all")}>
                All Time
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {queryParams.queue !== "all" && (
            <Badge variant="secondary" className="h-6 text-[11px] gap-1 whitespace-nowrap">
              {queryParams.queue}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => setQueryParams({ queue: "all", page: 0 })}
              />
            </Badge>
          )}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-8 text-xs">
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
