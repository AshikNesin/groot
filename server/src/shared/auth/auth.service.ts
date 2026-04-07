import bcrypt from "bcryptjs";
import { userModel } from "@/shared/auth/user.model";
import { Boom } from "@/core/errors";
import { generateToken } from "@/core/utils/jwt.utils";
import type { CreateUserDTO, LoginDTO } from "@/shared/auth/auth.validation";

export async function login(data: LoginDTO) {
  const user = await userModel.findByEmail(data.email);

  if (!user) {
    throw Boom.unauthorized("Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.password);

  if (!isPasswordValid) {
    throw Boom.unauthorized("Invalid email or password");
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

export async function createUser(data: CreateUserDTO) {
  const existingUser = await userModel.findByEmail(data.email);

  if (existingUser) {
    throw Boom.conflict("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await userModel.create({
    email: data.email,
    password: hashedPassword,
    name: data.name,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export async function getUserById({ userId }: { userId: number }) {
  const user = await userModel.findById(userId);

  if (!user) {
    throw Boom.notFound(`User with identifier '${userId}' not found`);
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export async function getAllUsers() {
  return userModel.findAll();
}

export async function deleteUser({ userId }: { userId: number }) {
  const user = await userModel.findById(userId);

  if (!user) {
    throw Boom.notFound(`User with identifier '${userId}' not found`);
  }

  await userModel.delete(userId);
}
