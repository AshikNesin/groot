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
import { EmptyState, ErrorState } from "@groot/ui/empty-state";
import { Input } from "@groot/ui/input";
import { Label } from "@groot/ui/label";
import { Badge } from "@groot/ui/badge";
import { Skeleton, SkeletonCard, SkeletonList } from "@groot/ui/loading-skeleton";
import { useConfirm } from "@groot/ui/primitives";
import { KeyRound, Smartphone, ShieldCheck, Plus, Pencil, Trash2, Fingerprint } from "lucide-react";
import { type ReactNode, useState } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, FormField } from "@groot/ui/form";
import { formatDisplayDate } from "@groot/shell/lib/utils";
import { useToastMutation } from "@groot/shell/hooks/useToastMutation";
import { type Passkey, passkeyService } from "@groot/shell/services/passkey";

const PASSKEYS_KEY = ["passkeys"] as const;

const passkeyNameSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

function PasskeyIcon({ deviceType, transports }: Passkey): ReactNode {
  if (deviceType === "platform") return <Smartphone className="size-5" />;
  if (transports.includes("usb")) return <KeyRound className="size-5" />;
  return <ShieldCheck className="size-5" />;
}

function formatDate(date: Date | null): string {
  if (!date) return "Never";
  return formatDisplayDate(date);
}

/**
 * Placeholder mirroring the "Add a passkey" form and the passkey list while
 * passkeys load, composed from the shared skeleton primitives.
 */
function PasskeyManagerSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonCard titleWidth="w-32" description>
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      </SkeletonCard>
      <Card className="gap-0 pb-0">
        <CardHeader className="border-b px-5 pb-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <SkeletonList rows={2} leading="circle" secondaryLine trailing={false} />
      </Card>
    </div>
  );
}

export function PasskeyManager() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const passkeysQuery = useQuery({
    queryKey: PASSKEYS_KEY,
    queryFn: () => passkeyService.listPasskeys(),
  });
  const passkeys = passkeysQuery.data ?? [];
  const isLoading = passkeysQuery.isLoading;

  const [newPasskeyName, setNewPasskeyName] = useState("");
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

  const handleDeletePasskey = async (passkey: Passkey) => {
    const isLast = passkeys.length === 1;
    const confirmed = await confirm({
      title: "Delete passkey",
      description: (
        <>
          Are you sure you want to delete “{passkey.credentialName || "this passkey"}”? You won’t be
          able to use it to sign in anymore.
          {isLast && (
            <span className="mt-2 block font-medium text-destructive">
              This is your last passkey. Make sure you can still access your account with a
              password.
            </span>
          )}
        </>
      ),
      confirmLabel: "Delete",
      destructive: true,
    });
    if (confirmed) deleteMutation.mutate(passkey.id);
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
    return <PasskeyManagerSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Add a passkey */}
      <Card>
        <CardHeader className="border-b px-5 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="size-4 text-primary" />
            Add a passkey
          </CardTitle>
          <CardDescription>
            Use biometrics (Face ID / Touch ID) or a security key for passwordless sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-3 px-5">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="passkey-name" className="text-xs">
              Name (optional)
            </Label>
            <Input
              id="passkey-name"
              placeholder="e.g. My iPhone, Work Laptop"
              value={newPasskeyName}
              onChange={(e) => setNewPasskeyName(e.target.value)}
              disabled={addMutation.isPending}
            />
          </div>
          <Button onClick={handleAddPasskey} disabled={addMutation.isPending}>
            <Plus className="size-3.5" />
            {addMutation.isPending ? "Adding…" : "Add passkey"}
          </Button>
        </CardContent>
      </Card>

      {/* Passkey list */}
      <Card className="gap-0 pb-0">
        <CardHeader className="border-b px-5 pb-4">
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            Your passkeys
          </CardTitle>
          <CardDescription>
            Devices currently authorised to sign in to your account.
          </CardDescription>
        </CardHeader>

        {passkeysQuery.isError ? (
          <ErrorState
            title="Couldn’t load passkeys."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => passkeysQuery.refetch()}
                disabled={passkeysQuery.isFetching}
              >
                {passkeysQuery.isFetching ? "Retrying…" : "Retry"}
              </Button>
            }
          />
        ) : passkeys.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No passkeys configured"
            description="Add a passkey above to enable passwordless authentication."
          />
        ) : (
          <ul className="divide-y divide-border">
            {passkeys.map((passkey) => (
              <li
                key={passkey.id}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <PasskeyIcon {...passkey} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {passkey.credentialName || "Unnamed passkey"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Added {formatDate(passkey.createdAt)}</span>
                      {passkey.lastUsedAt && (
                        <span>Last used {formatDate(passkey.lastUsedAt)}</span>
                      )}
                      {passkey.backedUp && <Badge variant="secondary">Backed up</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setPasskeyToEdit(passkey)}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeletePasskey(passkey)}
                    disabled={deleteMutation.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Edit name */}
      <Dialog open={!!passkeyToEdit} onOpenChange={() => setPasskeyToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit passkey name</DialogTitle>
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
            <FormField name="name" label="Passkey name">
              <Input placeholder="e.g. My iPhone, Work Laptop" />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasskeyToEdit(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateNameMutation.isPending}>
                {updateNameMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
