import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCreateTodo, useDeleteTodo, useTodos, useUpdateTodo } from "@/hooks/api/useTodos";
import { PageLayout } from "@/components/layout/PageLayout";

const todoSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

type TodoFormValues = z.infer<typeof todoSchema>;

export function Todos() {
  const { data: todos, isLoading } = useTodos();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const { toast } = useToast();

  const form = useForm<TodoFormValues>({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      title: "",
    },
  });

  const onSubmit = async (values: TodoFormValues) => {
    try {
      await createTodo.mutateAsync({ title: values.title });
      toast({ title: "Success", description: "Todo created" });
      form.reset();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Unable to create todo",
        variant: "destructive",
      });
    }
  };

  const toggleTodo = async (id: number, completed: boolean) => {
    try {
      await updateTodo.mutateAsync({ id, data: { completed } });
      toast({ title: "Updated", description: "Todo status updated" });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Unable to update todo",
        variant: "destructive",
      });
    }
  };

  const removeTodo = async (id: number) => {
    try {
      await deleteTodo.mutateAsync(id);
      toast({ title: "Deleted", description: "Todo removed" });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Unable to delete todo",
        variant: "destructive",
      });
    }
  };

  const actions = (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Todo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Todo</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Input id="title" placeholder="Todo title" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>
          <Button className="w-full" type="submit" disabled={createTodo.isPending}>
            {createTodo.isPending ? "Creating..." : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <PageLayout title="Todos" description="Track your tasks" actions={actions}>
      <div className="grid gap-4 md:grid-cols-2">
        {isLoading && <p>Loading todos...</p>}
        {!isLoading && todos?.length === 0 && <p>No todos yet.</p>}
        {todos?.map((todo) => (
          <Card key={todo.id}>
            <CardHeader>
              <CardTitle
                className={todo.completed ? "line-through text-muted-foreground" : undefined}
              >
                {todo.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                {todo.completed ? "Completed" : "Pending"}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={updateTodo.isPending}
                  onClick={() => toggleTodo(todo.id, !todo.completed)}
                >
                  {todo.completed ? "Mark Pending" : "Mark Done"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteTodo.isPending}
                  onClick={() => removeTodo(todo.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
