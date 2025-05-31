import { Request, Response } from 'express';
import * as todoModel from '@/models/todo.model';

export const createTodo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title } = req.body;
    if (!title) {
      res.status(400).json({ message: 'Title is required' });
      return;
    }
    const newTodo = await todoModel.create(title);
    res.status(201).json(newTodo);
  } catch (error) {
    res.status(500).json({ message: 'Error creating todo', error });
  }
};

export const getAllTodos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const todos = await todoModel.findAll();
    res.status(200).json(todos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching todos', error });
  }
};

export const getTodoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Invalid ID format' });
      return;
    }
    const todo = await todoModel.findById(id);
    if (!todo) {
      res.status(404).json({ message: 'Todo not found' });
    } else {
      res.status(200).json(todo);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching todo', error });
  }
};

export const updateTodo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Invalid ID format' });
      return;
    }
    const { title, completed } = req.body;
    if (title === undefined && completed === undefined) {
      res.status(400).json({ message: 'No update data provided (title or completed)' });
      return;
    }

    const dataToUpdate: { title?: string; completed?: boolean } = {};
    if (title !== undefined) {
      dataToUpdate.title = title;
    }
    if (completed !== undefined) {
      dataToUpdate.completed = completed;
    }

    const updatedTodo = await todoModel.update(id, dataToUpdate);
    if (!updatedTodo) {
      res.status(404).json({ message: 'Todo not found for update' });
    } else {
      res.status(200).json(updatedTodo);
    }
  } catch (error) {
    // Check for Prisma specific error for record not found during update
    if ((error as any).code === 'P2025') {
        res.status(404).json({ message: 'Todo not found for update (Prisma P2025)' });
    } else {
        res.status(500).json({ message: 'Error updating todo', error });
    }
  }
};

export const deleteTodo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Invalid ID format' });
      return;
    }
    const deletedTodo = await todoModel.remove(id);
    if (!deletedTodo) {
      res.status(404).json({ message: 'Todo not found for deletion' });
    } else {
      res.status(200).json({ message: 'Todo deleted successfully', todo: deletedTodo });
    }
  } catch (error) {
    // Check for Prisma specific error for record not found during delete
    if ((error as any).code === 'P2025') {
        res.status(404).json({ message: 'Todo not found for deletion (Prisma P2025)' });
    } else {
        res.status(500).json({ message: 'Error deleting todo', error });
    }
  }
};
