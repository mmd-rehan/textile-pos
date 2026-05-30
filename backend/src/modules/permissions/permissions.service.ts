import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  // Hardcoded predefined list of valid system permissions
  private permissions: string[] = [
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'roles:create',
    'roles:read',
    'roles:update',
    'roles:delete',
    'settings:read',
    'settings:update',
    'audit:read',
  ];

  async findAll(): Promise<string[]> {
    this.logger.log('Fetching system permissions');
    return this.permissions;
  }

  /**
   * Evaluates if a list of user permissions matches the required permission pattern.
   * Supports wildcard check (e.g. '*' or 'users:*')
   */
  async checkPermission(userPermissions: string[], requiredPermission: string): Promise<boolean> {
    this.logger.log(`Evaluating required permission: ${requiredPermission}`);
    
    if (userPermissions.includes('*')) {
      return true;
    }

    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Support wildcard groupings, e.g. "users:*" matches "users:read"
    const requiredParts = requiredPermission.split(':');
    if (requiredParts.length > 1) {
      const scopeWildcard = `${requiredParts[0]}:*`;
      if (userPermissions.includes(scopeWildcard)) {
        return true;
      }
    }

    return false;
  }
}
