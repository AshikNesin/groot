import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import dayjs from "dayjs";
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
import { Badge } from "@/ui/badge";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { type Passkey, passkeyService } from "@/core/services/passkey";
import { useCallback, useEffect, useState } from "react";

export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [passkeyToDelete, setPasskeyToDelete] = useState<Passkey | null>(null);
  const [passkeyToEdit, setPasskeyToEdit] = useState<Passkey | null>(null);
  const [newPasskeyName, setNewPasskeyName] = useState("");
  const [editedPasskeyName, setEditedPasskeyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPasskeys = useCallback(async () => {
    try {
      const data = await passkeyService.listPasskeys();
      setPasskeys(data);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to load passkeys");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPasskeys();
  }, [loadPasskeys]);

  const handleAddPasskey = async () => {
    setIsAddingPasskey(true);
    setError(null);
    setSuccess(null);
    try {
      await passkeyService.registerPasskey(newPasskeyName || undefined);
      setSuccess("Passkey added successfully");
      setNewPasskeyName("");
      await loadPasskeys();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to add passkey");
    } finally {
      setIsAddingPasskey(false);
    }
  };

  const handleDeletePasskey = async () => {
    if (!passkeyToDelete) return;

    setError(null);
    setSuccess(null);
    try {
      await passkeyService.deletePasskey(passkeyToDelete.id);
      setSuccess("Passkey deleted successfully");
      setPasskeyToDelete(null);
      await loadPasskeys();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to delete passkey");
    }
  };

  const handleUpdatePasskeyName = async () => {
    if (!passkeyToEdit || !editedPasskeyName.trim()) return;

    setError(null);
    setSuccess(null);
    try {
      await passkeyService.updatePasskeyName(passkeyToEdit.id, editedPasskeyName);
      setSuccess("Passkey name updated successfully");
      setPasskeyToEdit(null);
      setEditedPasskeyName("");
      await loadPasskeys();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to update passkey name");
    }
  };

  const getPasskeyIcon = (passkey: Passkey) => {
    if (passkey.deviceType === "platform") {
      return "📱";
    }
    if (passkey.transports.includes("usb")) {
      return "🔑";
    }
    return "🛡️";
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return dayjs(date).format("MMM D, YYYY");
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
          {/* Error/Success Messages */}
          {error && <Alert variant="destructive">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          {/* Add New Passkey */}
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="passkey-name">Passkey Name (Optional)</Label>
              <Input
                id="passkey-name"
                placeholder="e.g., My iPhone, Work Laptop"
                value={newPasskeyName}
                onChange={(e) => setNewPasskeyName(e.target.value)}
                disabled={isAddingPasskey}
              />
            </div>
            <Button onClick={handleAddPasskey} disabled={isAddingPasskey}>
              {isAddingPasskey ? "Adding..." : "Add Passkey"}
            </Button>
          </div>

          {/* Passkey List */}
          {passkeys.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
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
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-2xl">{getPasskeyIcon(passkey)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {passkey.credentialName || "Unnamed Passkey"}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span>Added {formatDate(passkey.createdAt)}</span>
                        {passkey.lastUsedAt && (
                          <span>Last used {formatDate(passkey.lastUsedAt)}</span>
                        )}
                        {passkey.backedUp && <Badge variant="secondary">Backed up</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPasskeyToEdit(passkey);
                        setEditedPasskeyName(passkey.credentialName || "");
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPasskeyToDelete(passkey)}
                      className="text-red-600 hover:text-red-700"
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
                <span className="block mt-2 text-red-600 font-medium">
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
            <Button variant="destructive" onClick={handleDeletePasskey}>
              Delete
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
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-passkey-name">Passkey Name</Label>
              <Input
                id="edit-passkey-name"
                placeholder="e.g., My iPhone, Work Laptop"
                value={editedPasskeyName}
                onChange={(e) => setEditedPasskeyName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasskeyToEdit(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePasskeyName} disabled={!editedPasskeyName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
