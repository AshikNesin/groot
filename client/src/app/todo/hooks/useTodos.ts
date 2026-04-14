import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/core/lib/api";
import type { Todo, CreateTodoDTO, UpdateTodoDTO } from "../types/todo";

export function useTodos() {
  return useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Todo[] }>("/todos");
      return data.data;
    },
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTodoDTO) => {
      const { data } = await api.post<{ data: Todo }>("/todos", input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: UpdateTodoDTO) => {
      const response = await api.put<{ data: Todo }>(`/todos/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/todos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}
