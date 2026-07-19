import { Button } from "@groot/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@groot/ui/dialog";
import { Input } from "@groot/ui/input";
import { Form, FormField, Field } from "@groot/ui/form";
import { LoadingSpinner } from "@groot/ui/loading-spinner";
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

export function AppSettings() {
  const s = useAppSettings();

  if (s.isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-border bg-card">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-muted-foreground">Loading settings…</p>
      </div>
    );
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
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold">New setting</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Give it a descriptive key — you can edit the value next.
            </p>
          </div>
          <div className="px-5 py-4">
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
          </div>
        </div>
      )}

      {/* Master / detail */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Settings list */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
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
        </div>

        {/* Editor */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          {s.selectedKey ? (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold">{s.selectedKey}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Edit the configuration below and save your changes.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={s.requestDelete}
                  disabled={s.isDeleting}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>

              <div className="space-y-5 p-5">
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
              </div>

              {/* Footer action row */}
              <div className="mt-auto flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-5 py-3">
                <Button size="sm" onClick={s.save} disabled={s.isSaving}>
                  <Save className="size-3.5" />
                  {s.isSaving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex h-96 flex-col items-center justify-center text-center">
              <FileJson className="size-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium">No setting selected</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose a setting from the list to edit its value.
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={s.showDeleteDialog} onOpenChange={s.setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete setting</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete “{s.selectedKey}”? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => s.setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={s.confirmDelete} disabled={s.isDeleting}>
              {s.isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
