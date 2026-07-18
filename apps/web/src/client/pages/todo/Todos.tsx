import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Check, Trash2, Loader2, ListChecks } from "lucide-react";
import { Button } from "@groot/ui/button";
import { Card } from "@groot/ui/card";
import { Checkbox } from "@groot/ui/checkbox";
import { Form, FormField } from "@groot/ui/form";
import { Input } from "@groot/ui/input";
import { Badge } from "@groot/ui/badge";
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
  const { data: todos, isLoading } = useTodos();
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
      {/* Summary strip. */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <Badge variant="secondary" className="gap-1.5">
          <ListChecks className="size-3.5" />
          {total} total
        </Badge>
        <Badge variant="secondary" className="gap-1.5">
          <Check className="size-3.5" />
          {completedCount} done
        </Badge>
        {total > 0 && (
          <span className="text-xs">{Math.round((completedCount / total) * 100)}% complete</span>
        )}
      </div>

      {/* List. */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading todos...
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <ListChecks className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No todos yet</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Create your first todo to get started.
              </p>
            </div>
          </div>
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
                {!todo.completed && (
                  <Badge variant="outline" className="hidden sm:inline-flex">
                    Pending
                  </Badge>
                )}
                {todo.completed && (
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    Done
                  </Badge>
                )}
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
