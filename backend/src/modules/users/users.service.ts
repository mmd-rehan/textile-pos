import { Injectable, Logger } from '@nestjs/common';
import { AppError } from '../../common/errors/app-error';

export interface User {
  id: string;
  email: string;
  name: string;
  roleId: string;
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  
  // In-memory placeholder store for users
  private users: User[] = [
    {
      id: 'admin-user-id',
      email: 'admin@textilepos.com',
      name: 'System Admin',
      roleId: 'admin-role-id',
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'cashier-user-id',
      email: 'cashier@textilepos.com',
      name: 'Cashier Jane',
      roleId: 'cashier-role-id',
      isActive: true,
      createdAt: new Date(),
    },
  ];

  async create(data: { email: string; name: string; roleId?: string }): Promise<User> {
    this.logger.log(`Creating user: ${data.email}`);
    
    // Check duplication
    const exists = this.users.some(u => u.email === data.email);
    if (exists) {
      throw AppError.conflict(`User with email ${data.email} already exists`, 'EMAIL_EXISTS');
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      email: data.email,
      name: data.name,
      roleId: data.roleId || 'cashier-role-id',
      isActive: true,
      createdAt: new Date(),
    };

    this.users.push(newUser);
    return newUser;
  }

  async findAll(): Promise<User[]> {
    this.logger.log('Fetching all users');
    return this.users;
  }

  async findOne(id: string): Promise<User> {
    this.logger.log(`Fetching user by ID: ${id}`);
    const user = this.users.find(u => u.id === id);
    if (!user) {
      throw AppError.notFound(`User with ID ${id} not found`, 'USER_NOT_FOUND');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.log(`Fetching user by Email: ${email}`);
    return this.users.find(u => u.email === email) || null;
  }

  async update(id: string, data: { name?: string; roleId?: string; isActive?: boolean }): Promise<User> {
    this.logger.log(`Updating user: ${id}`);
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) {
      throw AppError.notFound(`User with ID ${id} not found`, 'USER_NOT_FOUND');
    }

    const updatedUser = {
      ...this.users[index],
      ...data,
    };
    this.users[index] = updatedUser;
    return updatedUser;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    this.logger.log(`Deleting user: ${id}`);
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) {
      throw AppError.notFound(`User with ID ${id} not found`, 'USER_NOT_FOUND');
    }

    this.users.splice(index, 1);
    return { deleted: true };
  }
}
