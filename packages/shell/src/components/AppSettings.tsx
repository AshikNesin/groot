import { Button } from "@groot/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@groot/ui/card";
import { EmptyState } from "@groot/ui/empty-state";
import { Input } from "@groot/ui/input";
import { Form, FormField, Field } from "@groot/ui/form";
import { Skeleton, SkeletonCard, SkeletonList } from "@groot/ui/loading-skeleton";
import { useConfirm } from "@groot/ui/primitives";
import { Plus, RefreshCw, Search, Trash2, Save, FileJson } from "lucide-react";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { useAppSettings } from "@groot/shell/hooks/useAppSettings";
import { cn } from "@groot/ui/lib/utils";

const settingKeySchema = z.object({
  key: z.string().trim().min(1, "Key is required"),
});

const CodeMirrorEditor = lazy(() =>
  import("./CodeMirrorEditor").then((m) => ({ default: m.CodeMirrorEditor })),
);

/**
 * Placeholder mirroring the toolbar and master/detail grid while settings
 * load, composed from the shared skeleton primitives.
 */
function AppSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-5 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="gap-0 p-0">
          <div className="border-b border-border p-3">
            <Skeleton className="h-8 w-full" />
          </div>
          <SkeletonList rows={3} leading="none" trailing={false} />
        </Card>
        <SkeletonCard titleWidth="w-40" description>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-[400px] w-full" />
            </div>
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}

export function AppSettings() {
  const s = useAppSettings();
  const confirm = useConfirm();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete setting",
      description: `Are you sure you want to delete “${s.selectedKey}”? This action cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (confirmed) s.confirmDelete();
  };

  if (s.isLoading) {
    return <AppSettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileJson className="size-4" />
          <span>Application configuration stored as JSON.</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => s.refresh()}>
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => s.setShowNewSettingForm(true)}>
            <Plus className="size-3.5" />
            Add Setting
          </Button>
        </div>
      </div>

      {/* Add-setting inline form */}
      {s.showNewSettingForm && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm">New setting</CardTitle>
            <CardDescription className="text-xs">
              Give it a descriptive key — you can edit the value next.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form
              schema={settingKeySchema}
              defaultValues={{ key: "" }}
              onSubmit={({ key }) => s.createSetting(key)}
              className="flex items-start gap-2"
            >
              <FormField name="key" className="flex-1">
                <Input placeholder="e.g. featureFlags, theme, rateLimits" />
              </FormField>
              <Button type="submit" disabled={s.isCreating} size="sm">
                {s.isCreating ? "Creating…" : "Create"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => s.setShowNewSettingForm(false)}
                size="sm"
              >
                Cancel
              </Button>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Master / detail */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Settings list */}
        <Card className="gap-0 p-0">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search settings…"
                value={s.searchQuery}
                onChange={(e) => s.setSearchQuery(e.target.value)}
                className="h-8 pl-8"
              />
            </div>
          </div>
          <div className="min-h-[120px] flex-1 p-1.5">
            {s.settings.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No settings yet.
              </p>
            ) : s.filteredSettings.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matches.</p>
            ) : (
              <div className="space-y-0.5">
                {s.filteredSettings.map((setting) => {
                  const active = s.selectedKey === setting.key;
                  return (
                    <button
                      type="button"
                      key={setting.key}
                      onClick={() => s.selectKey(setting.key)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-left transition-colors",
                        active ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted",
                      )}
                    >
                      <div
                        className={cn(
                          "truncate text-sm font-medium",
                          active ? "text-primary" : "text-foreground",
                        )}
                      >
                        {setting.key}
                      </div>
                      {setting.metadata?.description && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {setting.metadata.description}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Editor */}
        <Card className="gap-0 p-0">
          {s.selectedKey ? (
            <>
              <CardHeader className="border-b px-5 py-4">
                <CardTitle className="truncate">{s.selectedKey}</CardTitle>
                <CardDescription className="text-xs">
                  Edit the configuration below and save your changes.
                </CardDescription>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={s.isDeleting}
                  className="col-start-2 row-span-2 row-start-1 self-start justify-self-end text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </CardHeader>

              <CardContent className="space-y-5 px-5 py-4">
                <Field label="Description" htmlFor="description">
                  <Input
                    id="description"
                    value={s.description}
                    onChange={(e) => s.setDescription(e.target.value)}
                    placeholder="Brief description of this setting"
                  />
                </Field>
                <Field label="JSON value" htmlFor="jsonEditor">
                  <div className="overflow-hidden rounded-md border border-border">
                    <Suspense fallback={<div className="h-[400px]" />}>
                      <CodeMirrorEditor
                        value={s.jsonValue}
                        height="400px"
                        onChange={(value) => s.setJsonValue(value)}
                        basicSetup={{
                          lineNumbers: true,
                          highlightActiveLineGutter: true,
                          highlightActiveLine: true,
                          foldGutter: true,
                        }}
                      />
                    </Suspense>
                  </div>
                </Field>
              </CardContent>

              <CardFooter className="mt-auto justify-end gap-2 px-5 py-3">
                <Button size="sm" onClick={s.save} disabled={s.isSaving}>
                  <Save className="size-3.5" />
                  {s.isSaving ? "Saving…" : "Save changes"}
                </Button>
              </CardFooter>
            </>
          ) : (
            <EmptyState
              icon={FileJson}
              title="No setting selected"
              description="Choose a setting from the list to edit its value."
              className="h-96"
            />
          )}
        </Card>
      </div>
    </div>
  );
}
