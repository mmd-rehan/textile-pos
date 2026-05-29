import { Injectable, Logger } from '@nestjs/common';
import { AppError } from '../../common/errors/app-error';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  private roles: Role[] = [
    {
      id: 'admin-role-id',
      name: 'Administrator',
      description: 'Full access to all modules and system configurations',
      permissions: ['*'],
    },
    {
      id: 'manager-role-id',
      name: 'Manager',
      description: 'Access to inventory, sales, and settings, but no user control',
      permissions: ['inventory:*', 'sales:*', 'settings:read'],
    },
    {
      id: 'cashier-role-id',
      name: 'Cashier',
      description: 'Access to POS screen and sales transactions',
      permissions: ['sales:create', 'sales:read'],
    },
  ];

  async findAll(): Promise<Role[]> {
    this.logger.log('Fetching all roles');
    return this.roles;
  }

  async findOne(id: string): Promise<Role> {
    this.logger.log(`Fetching role by ID: ${id}`);
    const role = this.roles.find(r => r.id === id);
    if (!role) {
      throw AppError.notFound(`Role with ID ${id} not found`, 'ROLE_NOT_FOUND');
    }
    return role;
  }

  async create(data: { name: string; description: string; permissions: string[] }): Promise<Role> {
    this.logger.log(`Creating new role: ${data.name}`);
    
    const exists = this.roles.some(r => r.name.toLowerCase() === data.name.toLowerCase());
    if (exists) {
      throw AppError.conflict(`Role with name ${data.name} already exists`, 'ROLE_EXISTS');
    }

    const newRole: Role = {
      id: `role-${Date.now()}`,
      name: data.name,
      description: data.description,
      permissions: data.permissions,
    };

    this.roles.push(newRole);
    return newRole;
  }
}
