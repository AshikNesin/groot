import { prisma } from "../server/src/core/database.js";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  const hashedPassword = await bcrypt.hash("password123", 10);
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      password: hashedPassword,
    },
  });

  const todos = [
    { id: 1, title: "Learn Prisma", completed: true },
    { id: 2, title: "Build an API", completed: false },
    { id: 3, title: "Write tests", completed: false },
  ];

  for (const todo of todos) {
    await prisma.todo.upsert({
      where: { id: todo.id },
      update: {},
      create: { title: todo.title, completed: todo.completed },
    });
  }

  console.log("Seeded user:", user.email);
  console.log("Seeded todos:", todos.length);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
