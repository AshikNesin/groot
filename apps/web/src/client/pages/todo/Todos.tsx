import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Check, Trash2, Loader2, ListChecks, RotateCcw } from "lucide-react";
import { Button } from "@groot/ui/button";
import { Card } from "@groot/ui/card";
import { Checkbox } from "@groot/ui/checkbox";
import { EmptyState, ErrorState } from "@groot/ui/empty-state";
import { Form, FormField } from "@groot/ui/form";
import { Input } from "@groot/ui/input";
import { Badge } from "@groot/ui/badge";
import { StatusBadge } from "@groot/ui/status-badge";
import { Skeleton, SkeletonList } from "@groot/ui/loading-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@groot/ui/dialog";
import { useCreateTodo, useDeleteTodo, useTodos, useUpdateTodo } from "./hooks/useTodos";
import { PageLayout } from "@groot/shell/components/layout/PageLayout";
import { cn } from "@groot/ui/lib/utils";

const todoSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export function Todos() {
  const { data: todos, isLoading, isError, refetch } = useTodos();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  // Bumping this key remounts (and thus resets) the create form after a submit.
  const [formKey, setFormKey] = useState(0);

  const onSubmit = async (values: { title: string }) => {
    try {
      await createTodo.mutateAsync({ title: values.title });
      toast.success("Success", { description: "Todo created" });
      setFormKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "Unable to create todo",
      });
    }
  };

  const toggleTodo = async (id: number, completed: boolean) => {
    try {
      await updateTodo.mutateAsync({ id, data: { completed } });
      toast.success("Updated", { description: "Todo status updated" });
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "Unable to update todo",
      });
    }
  };

  const removeTodo = async (id: number) => {
    try {
      await deleteTodo.mutateAsync(id);
      toast.success("Deleted", { description: "Todo removed" });
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "Unable to delete todo",
      });
    }
  };

  const actions = (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="size-4" />
          Create Todo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Todo</DialogTitle>
          <DialogDescription>Create a new task to track.</DialogDescription>
        </DialogHeader>
        <Form
          key={formKey}
          schema={todoSchema}
          defaultValues={{ title: "" }}
          onSubmit={onSubmit}
          className="space-y-4"
        >
          <FormField name="title" label="Title">
            <Input placeholder="e.g. Ship the landing page" autoFocus />
          </FormField>
          <Button className="w-full" type="submit" size="lg" disabled={createTodo.isPending}>
            {createTodo.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {createTodo.isPending ? "Creating..." : "Create"}
          </Button>
        </Form>
      </DialogContent>
    </Dialog>
  );

  const completedCount = todos?.filter((t) => t.completed).length ?? 0;
  const total = todos?.length ?? 0;

  return (
    <PageLayout title="Todos" description="Track your tasks" actions={actions} maxWidth="7xl">
      {/* Summary strip. Skeletons while loading so bogus zeros don't flash. */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {isLoading ? (
          <>
            <Skeleton className="h-5.5 w-20 rounded-4xl" />
            <Skeleton className="h-5.5 w-18 rounded-4xl" />
          </>
        ) : (
          <>
            <Badge variant="secondary" className="gap-1.5">
              <ListChecks className="size-3.5" />
              {total} total
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Check className="size-3.5" />
              {completedCount} done
            </Badge>
            {total > 0 && (
              <span className="text-xs">
                {Math.round((completedCount / total) * 100)}% complete
              </span>
            )}
          </>
        )}
      </div>

      {/* List. */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <SkeletonList rows={5} />
        ) : isError ? (
          <ErrorState
            title="Failed to load todos"
            description="Unable to fetch your todo list. Please try again."
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RotateCcw className="size-4" />
                Retry
              </Button>
            }
          />
        ) : total === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No todos yet"
            description="Create your first todo to get started."
          />
        ) : (
          <ul className="divide-y divide-border">
            {todos?.map((todo) => (
              <li
                key={todo.id}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-5"
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={(checked) => toggleTodo(todo.id, checked === true)}
                  disabled={updateTodo.isPending}
                  aria-label={`Mark ${todo.title} as ${todo.completed ? "pending" : "done"}`}
                />
                <span
                  className={cn(
                    "flex-1 truncate text-sm",
                    todo.completed ? "text-muted-foreground line-through" : "text-foreground",
                  )}
                >
                  {todo.title}
                </span>
                <StatusBadge
                  status={todo.completed ? "completed" : "pending"}
                  label={todo.completed ? "Done" : "Pending"}
                  className="hidden sm:inline-flex"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={deleteTodo.isPending}
                  onClick={() => removeTodo(todo.id)}
                  aria-label={`Delete ${todo.title}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageLayout>
  );
}
