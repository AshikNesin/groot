import { Router } from 'express';
import * as todoController from '@/controllers/todo.controller';

const router = Router();

// Create a new Todo
router.post('/todos', todoController.createTodo);

// Get all Todos
router.get('/todos', todoController.getAllTodos);

// Get a single Todo by ID
router.get('/todos/:id', todoController.getTodoById);

// Update a Todo by ID
router.put('/todos/:id', todoController.updateTodo);

// Delete a Todo by ID
router.delete('/todos/:id', todoController.deleteTodo);

export default router;
