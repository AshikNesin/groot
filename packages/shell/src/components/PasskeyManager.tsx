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
import { Badge } from "@groot/ui/badge";
import { LoadingSpinner } from "@groot/ui/loading-spinner";
import { type Passkey, passkeyService } from "../services/passkey";
import { useState } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, FormField } from "@groot/ui/form";
import { formatDisplayDate } from "../lib/utils";
import { useToastMutation } from "../hooks/useToastMutation";

const PASSKEYS_KEY = ["passkeys"] as const;

const passkeyNameSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

function getPasskeyIcon(passkey: Passkey): string {
  if (passkey.deviceType === "platform") {
    return "📱";
  }
  if (passkey.transports.includes("usb")) {
    return "🔑";
  }
  return "🛡️";
}

function formatDate(date: Date | null): string {
  if (!date) return "Never";
  return formatDisplayDate(date);
}

export function PasskeyManager() {
  const queryClient = useQueryClient();
  const { data: passkeys = [], isLoading } = useQuery({
    queryKey: PASSKEYS_KEY,
    queryFn: () => passkeyService.listPasskeys(),
  });

  const [newPasskeyName, setNewPasskeyName] = useState("");
  const [passkeyToDelete, setPasskeyToDelete] = useState<Passkey | null>(null);
  const [passkeyToEdit, setPasskeyToEdit] = useState<Passkey | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: PASSKEYS_KEY });

  const addMutation = useToastMutation(
    (name: string | undefined) => passkeyService.registerPasskey(name),
    {
      success: "Passkey added successfully",
      error: { title: "Add failed", description: "Unable to add passkey" },
      onSuccess: invalidate,
    },
  );

  const deleteMutation = useToastMutation((id: number) => passkeyService.deletePasskey(id), {
    success: "Passkey deleted successfully",
    error: { title: "Delete failed", description: "Unable to delete passkey" },
    onSuccess: invalidate,
  });

  const updateNameMutation = useToastMutation(
    (vars: { id: number; name: string }) => passkeyService.updatePasskeyName(vars.id, vars.name),
    {
      success: "Passkey name updated successfully",
      error: { title: "Update failed", description: "Unable to update passkey name" },
      onSuccess: invalidate,
    },
  );

  const handleAddPasskey = () => {
    addMutation.mutate(newPasskeyName || undefined, {
      onSuccess: () => setNewPasskeyName(""),
    });
  };

  const handleDeletePasskey = () => {
    if (!passkeyToDelete) return;
    deleteMutation.mutate(passkeyToDelete.id, {
      onSuccess: () => setPasskeyToDelete(null),
    });
  };

  const handleUpdatePasskeyName = (name: string) => {
    if (!passkeyToEdit) return;
    updateNameMutation.mutate(
      { id: passkeyToEdit.id, name },
      {
        onSuccess: () => {
          setPasskeyToEdit(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Passkeys</CardTitle>
          <CardDescription>Loading passkeys...</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingSpinner size="md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">🔐 Passkeys</CardTitle>
          <CardDescription>
            Manage your passkeys for secure, passwordless authentication. Passkeys use biometric
            authentication (like Face ID or fingerprint) or device PINs for a more secure login
            experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Passkey */}
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="passkey-name">Passkey Name (Optional)</Label>
              <Input
                id="passkey-name"
                placeholder="e.g., My iPhone, Work Laptop"
                value={newPasskeyName}
                onChange={(e) => setNewPasskeyName(e.target.value)}
                disabled={addMutation.isPending}
              />
            </div>
            <Button onClick={handleAddPasskey} disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add Passkey"}
            </Button>
          </div>

          {/* Passkey List */}
          {passkeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-4">🔐</div>
              <p>No passkeys configured yet.</p>
              <p className="text-sm mt-2">
                Add a passkey above to enable passwordless authentication.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {passkeys.map((passkey) => (
                <div
                  key={passkey.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-2xl">{getPasskeyIcon(passkey)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {passkey.credentialName || "Unnamed Passkey"}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>Added {formatDate(passkey.createdAt)}</span>
                        {passkey.lastUsedAt && (
                          <span>Last used {formatDate(passkey.lastUsedAt)}</span>
                        )}
                        {passkey.backedUp && <Badge variant="secondary">Backed up</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPasskeyToEdit(passkey)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPasskeyToDelete(passkey)}
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!passkeyToDelete} onOpenChange={() => setPasskeyToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Passkey</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{passkeyToDelete?.credentialName || "this passkey"}"?
              You won't be able to use it to sign in anymore.
              {passkeys.length === 1 && (
                <span className="block mt-2 text-destructive font-medium">
                  This is your last passkey. Make sure you can still access your account with a
                  password.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasskeyToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePasskey}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Name Dialog */}
      <Dialog open={!!passkeyToEdit} onOpenChange={() => setPasskeyToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Passkey Name</DialogTitle>
            <DialogDescription>
              Give your passkey a memorable name to help identify it.
            </DialogDescription>
          </DialogHeader>
          <Form
            schema={passkeyNameSchema}
            defaultValues={{ name: passkeyToEdit?.credentialName ?? "" }}
            onSubmit={({ name }) => handleUpdatePasskeyName(name)}
            className="space-y-4 py-4"
          >
            <FormField name="name" label="Passkey Name">
              <Input placeholder="e.g., My iPhone, Work Laptop" />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasskeyToEdit(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateNameMutation.isPending}>
                {updateNameMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
