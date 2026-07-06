import { type AppSetting, settingsService } from "@/core/services/settings";
import { useCallback, useEffect, useState } from "react";

/**
 * State + mutations for the AppSettings page. Owns the settings list, the
 * selected setting, the editable JSON/description drafts, and the create /
 * save / delete flows. The draft reset (setState-during-render) mirrors the
 * selected setting's server value so the editor re-syncs after a save.
 */
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userSelectedKey, setUserSelectedKey] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState<string | null>(null);
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

  // Selection: the user's explicit choice, else the first setting once loaded.
  // Deriving this replaces the "auto-select first setting" syncing effect.
  const selectedKey = userSelectedKey ?? settings[0]?.key ?? null;
  const selected = selectedKey ? (settings.find((s) => s.key === selectedKey) ?? null) : null;

  // The JSON editor + description are editable drafts, so they stay in state —
  // but we reset them when the selection OR the selected setting's server value
  // changes. That covers initial load, switching setting, and re-syncing the
  // editor after a save/refresh when the server returns a normalized value.
  // Replaces the old [selectedKey, settings] syncing effect.
  const resetKey = `${selectedKey ?? ""}|${selected ? JSON.stringify(selected.value) : ""}|${
    selected?.metadata?.description ?? ""
  }`;
  if (resetKey !== draftKey) {
    setDraftKey(resetKey);
    setJsonValue(selected ? JSON.stringify(selected.value, null, 2) : "");
    setDescription(selected?.metadata?.description ?? "");
  }

  const save = async () => {
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

  const requestDelete = () => setShowDeleteDialog(true);

  const confirmDelete = async () => {
    if (!selectedKey) return;
    setIsDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      await settingsService.deleteSetting(selectedKey);
      setSuccess("Setting deleted successfully");
      setUserSelectedKey(null);
      setShowDeleteDialog(false);
      await loadSettings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete setting");
    } finally {
      setIsDeleting(false);
    }
  };

  const createSetting = async () => {
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
      setUserSelectedKey(newSettingKey);
      setNewSettingKey("");
      setShowNewSettingForm(false);
      await loadSettings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create setting");
    } finally {
      setIsCreating(false);
    }
  };

  return {
    settings,
    isLoading,
    filteredSettings,
    selectedKey,
    selected,
    selectKey: setUserSelectedKey,
    searchQuery,
    setSearchQuery,
    jsonValue,
    setJsonValue,
    description,
    setDescription,
    newSettingKey,
    setNewSettingKey,
    showNewSettingForm,
    setShowNewSettingForm,
    showDeleteDialog,
    setShowDeleteDialog,
    error,
    success,
    isSaving,
    isDeleting,
    isCreating,
    refresh: loadSettings,
    save,
    requestDelete,
    confirmDelete,
    createSetting,
  };
}
