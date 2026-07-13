import { Button } from "@groot/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@groot/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@groot/ui/dialog";
import { Input } from "@groot/ui/input";
import { Label } from "@groot/ui/label";
import { Form, FormField } from "@groot/ui/form";
import { LoadingSpinner } from "@groot/ui/loading-spinner";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { useAppSettings } from "@groot/shell/hooks/useAppSettings";

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
      <div className="flex h-96 flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage application configuration settings in JSON format
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => s.refresh()}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => s.setShowNewSettingForm(true)}>
            Add Setting
          </Button>
        </div>
      </div>

      {s.showNewSettingForm && (
        <Card>
          <CardContent className="pt-6">
            <Form
              schema={settingKeySchema}
              defaultValues={{ key: "" }}
              onSubmit={({ key }) => s.createSetting(key)}
              className="flex items-start gap-2"
            >
              <FormField name="key" className="flex-1">
                <Input placeholder="Enter setting key (e.g., myNewSetting)" />
              </FormField>
              <Button type="submit" disabled={s.isCreating} size="sm">
                {s.isCreating ? "Creating..." : "Create"}
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

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Settings List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="search"
              placeholder="Search..."
              value={s.searchQuery}
              onChange={(e) => s.setSearchQuery(e.target.value)}
              className="h-9"
            />
            {s.settings.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No settings found</p>
            ) : s.filteredSettings.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No matches</p>
            ) : (
              <div className="space-y-1">
                {s.filteredSettings.map((setting) => (
                  <button
                    type="button"
                    key={setting.key}
                    onClick={() => s.selectKey(setting.key)}
                    className={`w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                      s.selectedKey === setting.key
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium">{setting.key}</div>
                    {setting.metadata?.description && (
                      <div className="mt-0.5 text-xs opacity-80 truncate">
                        {setting.metadata.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle>{s.selectedKey || "No setting selected"}</CardTitle>
                <CardDescription>
                  {s.selectedKey
                    ? "Edit the configuration below"
                    : "Select a setting from the list"}
                </CardDescription>
              </div>
              {s.selectedKey && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={s.requestDelete}
                    disabled={s.isDeleting}
                  >
                    Delete
                  </Button>
                  <Button size="sm" onClick={s.save} disabled={s.isSaving}>
                    {s.isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {s.selectedKey ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="description" className="text-sm">
                    Description
                  </Label>
                  <Input
                    id="description"
                    value={s.description}
                    onChange={(e) => s.setDescription(e.target.value)}
                    placeholder="Brief description of this setting"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="jsonEditor" className="text-sm">
                    JSON Value
                  </Label>
                  <div className="mt-1.5 overflow-hidden rounded-md border">
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
                </div>
              </div>
            ) : (
              <div className="flex h-96 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Select a setting from the list to edit
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={s.showDeleteDialog} onOpenChange={s.setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Setting</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{s.selectedKey}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => s.setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={s.confirmDelete} disabled={s.isDeleting}>
              {s.isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
