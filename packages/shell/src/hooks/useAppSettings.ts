import { settingsService } from "@groot/shell/services/settings";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToastMutation } from "./useToastMutation";

const SETTINGS_KEY = ["app-settings"] as const;

/**
 * State + mutations for the AppSettings page. The settings list comes from a
 * React Query cache; the editable JSON/description drafts and dialog/selection
 * state stay local. The draft reset (setState-during-render) mirrors the
 * selected setting's server value so the editor re-syncs after a save/refetch.
 */
export function useAppSettings() {
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => settingsService.getSettings(),
  });

  const [userSelectedKey, setUserSelectedKey] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [jsonValue, setJsonValue] = useState("");
  const [description, setDescription] = useState("");
  const [showNewSettingForm, setShowNewSettingForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });

  const filteredSettings = settings.filter((setting) =>
    setting.key.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Selection: the user's explicit choice, else the first setting once loaded.
  const selectedKey = userSelectedKey ?? settings[0]?.key ?? null;
  const selected = selectedKey ? (settings.find((s) => s.key === selectedKey) ?? null) : null;

  // Reset the JSON editor + description drafts when the selection OR the
  // selected setting's server value changes (covers load, switch, and
  // re-sync after a save). Replaces the old syncing effect.
  const resetKey = `${selectedKey ?? ""}|${selected ? JSON.stringify(selected.value) : ""}|${
    selected?.metadata?.description ?? ""
  }`;
  if (resetKey !== draftKey) {
    setDraftKey(resetKey);
    setJsonValue(selected ? JSON.stringify(selected.value, null, 2) : "");
    setDescription(selected?.metadata?.description ?? "");
  }

  const saveMutation = useToastMutation(
    (vars: { key: string; jsonValue: string; description: string }) => {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(vars.jsonValue);
      } catch {
        throw new Error("Invalid JSON format");
      }
      return settingsService.upsertSetting(vars.key, {
        value: parsedValue,
        metadata: { description: vars.description || undefined },
      });
    },
    {
      success: (data) => `"${data.key}" updated successfully`,
      error: { title: "Save failed", description: "Unable to update setting" },
      onSuccess: invalidate,
    },
  );

  const deleteMutation = useToastMutation((key: string) => settingsService.deleteSetting(key), {
    success: "Setting deleted successfully",
    error: { title: "Delete failed", description: "Unable to delete setting" },
    onSuccess: invalidate,
  });

  const createMutation = useToastMutation(
    (key: string) =>
      settingsService.upsertSetting(key, { value: {}, metadata: { description: "New setting" } }),
    {
      success: (data) => `"${data.key}" created successfully`,
      error: { title: "Create failed", description: "Unable to create setting" },
      onSuccess: invalidate,
    },
  );

  const save = () => {
    if (!selectedKey) return;
    saveMutation.mutate({ key: selectedKey, jsonValue, description });
  };

  const confirmDelete = () => {
    if (!selectedKey) return;
    deleteMutation.mutate(selectedKey, {
      onSuccess: () => {
        setUserSelectedKey(null);
        setShowDeleteDialog(false);
      },
    });
  };

  const createSetting = (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed, {
      onSuccess: () => {
        setUserSelectedKey(trimmed);
        setShowNewSettingForm(false);
      },
    });
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
    showNewSettingForm,
    setShowNewSettingForm,
    showDeleteDialog,
    setShowDeleteDialog,
    refresh: invalidate,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCreating: createMutation.isPending,
    save,
    requestDelete: () => setShowDeleteDialog(true),
    confirmDelete,
    createSetting,
  };
}
