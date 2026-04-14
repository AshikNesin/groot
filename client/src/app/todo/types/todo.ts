export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoDTO {
  title: string;
  completed?: boolean;
}

export interface UpdateTodoDTO {
  id: number;
  data: Partial<CreateTodoDTO>;
}
