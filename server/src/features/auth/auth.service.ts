import bcrypt from "bcryptjs";
import { userModel } from "@/features/auth/user.model";
import { Boom } from "@/core/errors";
import { generateToken } from "@/core/utils/jwt.utils";
import type { CreateUserDTO, LoginDTO } from "@/features/auth/auth.validation";

class AuthService {
  async login(data: LoginDTO) {
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

  async createUser(data: CreateUserDTO) {
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

  async getUserById(userId: number) {
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

  async getAllUsers() {
    return userModel.findAll();
  }

  async deleteUser(userId: number) {
    const user = await userModel.findById(userId);

    if (!user) {
      throw Boom.notFound(`User with identifier '${userId}' not found`);
    }

    await userModel.delete(userId);
  }
}

export const authService = new AuthService();
