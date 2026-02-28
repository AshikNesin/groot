import { prisma } from "@/core/database";
import type { User, Todo } from "@/generated/prisma/models";

let counter = 0;

/**
 * Create a test user with unique email
 */
export async function createUser(
  overrides: Partial<User> = {},
): Promise<User> {
  counter++;
  const uniqueId = `${Date.now()}-${counter}`;
  return prisma.user.create({
    data: {
      email: `user-${uniqueId}@test.com`,
      name: `Test User ${counter}`,
      password: "$2a$10$dummyHashForTestingPurposesOnly", // bcrypt hash of "password"
      ...overrides,
    },
  });
}

/**
 * Create a test todo
 */
export async function createTodo(
  overrides: Partial<Todo> = {},
): Promise<Todo> {
  const user = overrides.userId ? { id: overrides.userId } : await createUser();

  counter++;
  return prisma.todo.create({
    data: {
      title: `Test Todo ${counter}`,
      userId: user.id,
      completed: false,
      ...overrides,
    },
  });
}

/**
 * Cleanup test data (run in afterEach/afterAll)
 */
export async function cleanupTestData() {
  await prisma.todo.deleteMany({
    where: { title: { startsWith: "Test Todo" } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@test.com" } },
  });
}
