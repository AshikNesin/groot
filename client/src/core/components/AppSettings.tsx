import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Alert } from "@/ui/alert";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { type AppSetting, settingsService } from "@/core/services/settings";
import { json } from "@codemirror/lang-json";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback, useEffect, useState } from "react";

export function AppSettings() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [jsonValue, setJsonValue] = useState("");
  const [description, setDescription] = useState("");
  const [newSettingKey, setNewSettingKey] = useState("");
  const [showNewSettingForm, setShowNewSettingForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setError(null);
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const filteredSettings = settings.filter((setting) =>
    setting.key.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  useEffect(() => {
    if (settings.length > 0 && !selectedKey) {
      setSelectedKey(settings[0].key);
    }
  }, [settings, selectedKey]);

  useEffect(() => {
    if (selectedKey) {
      const setting = settings.find((s) => s.key === selectedKey);
      if (setting) {
        setJsonValue(JSON.stringify(setting.value, null, 2));
        setDescription(setting.metadata?.description || "");
      }
    }
  }, [selectedKey, settings]);

  const handleSave = async () => {
    if (!selectedKey) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(jsonValue);
      } catch {
        throw new Error("Invalid JSON format");
      }

      await settingsService.upsertSetting(selectedKey, {
        value: parsedValue,
        metadata: { description: description || undefined },
      });
      setSuccess(`"${selectedKey}" has been updated successfully`);
      await loadSettings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save setting");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedKey) return;
    setIsDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      await settingsService.deleteSetting(selectedKey);
      setSuccess("Setting deleted successfully");
      setSelectedKey(null);
      setShowDeleteDialog(false);
      await loadSettings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete setting");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateSetting = async () => {
    if (!newSettingKey) {
      setError("Setting key is required");
      return;
    }
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      await settingsService.upsertSetting(newSettingKey, {
        value: {},
        metadata: { description: "New setting" },
      });
      setSuccess(`"${newSettingKey}" has been created successfully`);
      setSelectedKey(newSettingKey);
      setNewSettingKey("");
      setShowNewSettingForm(false);
      await loadSettings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create setting");
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="destructive">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Manage application configuration settings in JSON format
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => loadSettings()}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowNewSettingForm(true)}>
            Add Setting
          </Button>
        </div>
      </div>

      {showNewSettingForm && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={newSettingKey}
                  onChange={(e) => setNewSettingKey(e.target.value)}
                  placeholder="Enter setting key (e.g., myNewSetting)"
                />
              </div>
              <Button
                onClick={handleCreateSetting}
                disabled={!newSettingKey || isCreating}
                size="sm"
              >
                {isCreating ? "Creating..." : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setShowNewSettingForm(false)} size="sm">
                Cancel
              </Button>
            </div>
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
            {settings.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">No settings found</p>
            ) : filteredSettings.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">No matches</p>
            ) : (
              <div className="space-y-1">
                {filteredSettings.map((setting) => (
                  <button
                    type="button"
                    key={setting.key}
                    onClick={() => setSelectedKey(setting.key)}
                    className={`w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                      selectedKey === setting.key
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-gray-100"
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
                <CardTitle>{selectedKey || "No setting selected"}</CardTitle>
                <CardDescription>
                  {selectedKey ? "Edit the configuration below" : "Select a setting from the list"}
                </CardDescription>
              </div>
              {selectedKey && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDelete} disabled={isDeleting}>
                    Delete
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedKey ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="description" className="text-sm">
                    Description
                  </Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this setting"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="jsonEditor" className="text-sm">
                    JSON Value
                  </Label>
                  <div className="mt-1.5 overflow-hidden rounded-md border">
                    <CodeMirror
                      value={jsonValue}
                      height="400px"
                      extensions={[json()]}
                      onChange={(value) => setJsonValue(value)}
                      theme="light"
                      basicSetup={{
                        lineNumbers: true,
                        highlightActiveLineGutter: true,
                        highlightActiveLine: true,
                        foldGutter: true,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-96 items-center justify-center">
                <p className="text-sm text-gray-500">Select a setting from the list to edit</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Setting</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedKey}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
