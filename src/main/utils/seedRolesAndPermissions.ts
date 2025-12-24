import Database from 'better-sqlite3';
import { RoleRepository } from '../repositories/RoleRepository';
import { PermissionRepository } from '../repositories/PermissionRepository';
import { SystemRole } from '../models/Role';
import { Resource, Action, buildPermissionName } from '../models/Permission';

/**
 * Seed default roles and permissions
 */
export function seedRolesAndPermissions(db: Database.Database): void {
  const roleRepo = new RoleRepository(db);
  const permissionRepo = new PermissionRepository(db);

  // Check if already seeded
  const existingRoles = roleRepo.findAll();
  if (existingRoles.length > 0) {
    console.log('Roles already seeded, skipping...');
    return;
  }

  console.log('Seeding default roles and permissions...');

  // Create permissions for all resources and actions
  const permissions = [
    // Project permissions
    { name: buildPermissionName(Resource.Project, Action.Create), resource: Resource.Project, action: Action.Create, description: 'Create new projects' },
    { name: buildPermissionName(Resource.Project, Action.Read), resource: Resource.Project, action: Action.Read, description: 'View projects' },
    { name: buildPermissionName(Resource.Project, Action.Update), resource: Resource.Project, action: Action.Update, description: 'Edit projects' },
    { name: buildPermissionName(Resource.Project, Action.Delete), resource: Resource.Project, action: Action.Delete, description: 'Delete projects' },
    { name: buildPermissionName(Resource.Project, Action.Manage), resource: Resource.Project, action: Action.Manage, description: 'Full project management' },
    
    // Task permissions
    { name: buildPermissionName(Resource.Task, Action.Create), resource: Resource.Task, action: Action.Create, description: 'Create new tasks' },
    { name: buildPermissionName(Resource.Task, Action.Read), resource: Resource.Task, action: Action.Read, description: 'View tasks' },
    { name: buildPermissionName(Resource.Task, Action.Update), resource: Resource.Task, action: Action.Update, description: 'Edit tasks' },
    { name: buildPermissionName(Resource.Task, Action.Delete), resource: Resource.Task, action: Action.Delete, description: 'Delete tasks' },
    
    // Comment permissions
    { name: buildPermissionName(Resource.Comment, Action.Create), resource: Resource.Comment, action: Action.Create, description: 'Add comments' },
    { name: buildPermissionName(Resource.Comment, Action.Read), resource: Resource.Comment, action: Action.Read, description: 'View comments' },
    { name: buildPermissionName(Resource.Comment, Action.Update), resource: Resource.Comment, action: Action.Update, description: 'Edit comments' },
    { name: buildPermissionName(Resource.Comment, Action.Delete), resource: Resource.Comment, action: Action.Delete, description: 'Delete comments' },
    
    // Label permissions
    { name: buildPermissionName(Resource.Label, Action.Create), resource: Resource.Label, action: Action.Create, description: 'Create labels' },
    { name: buildPermissionName(Resource.Label, Action.Read), resource: Resource.Label, action: Action.Read, description: 'View labels' },
    { name: buildPermissionName(Resource.Label, Action.Update), resource: Resource.Label, action: Action.Update, description: 'Edit labels' },
    { name: buildPermissionName(Resource.Label, Action.Delete), resource: Resource.Label, action: Action.Delete, description: 'Delete labels' },
    
    // Attachment permissions
    { name: buildPermissionName(Resource.Attachment, Action.Create), resource: Resource.Attachment, action: Action.Create, description: 'Upload attachments' },
    { name: buildPermissionName(Resource.Attachment, Action.Read), resource: Resource.Attachment, action: Action.Read, description: 'Download attachments' },
    { name: buildPermissionName(Resource.Attachment, Action.Delete), resource: Resource.Attachment, action: Action.Delete, description: 'Delete attachments' },
    
    // Custom field permissions
    { name: buildPermissionName(Resource.CustomField, Action.Create), resource: Resource.CustomField, action: Action.Create, description: 'Create custom fields' },
    { name: buildPermissionName(Resource.CustomField, Action.Read), resource: Resource.CustomField, action: Action.Read, description: 'View custom fields' },
    { name: buildPermissionName(Resource.CustomField, Action.Update), resource: Resource.CustomField, action: Action.Update, description: 'Edit custom fields' },
    { name: buildPermissionName(Resource.CustomField, Action.Delete), resource: Resource.CustomField, action: Action.Delete, description: 'Delete custom fields' },
    
    // Member permissions
    { name: buildPermissionName(Resource.Member, Action.Create), resource: Resource.Member, action: Action.Create, description: 'Add members to projects' },
    { name: buildPermissionName(Resource.Member, Action.Read), resource: Resource.Member, action: Action.Read, description: 'View project members' },
    { name: buildPermissionName(Resource.Member, Action.Update), resource: Resource.Member, action: Action.Update, description: 'Change member roles' },
    { name: buildPermissionName(Resource.Member, Action.Delete), resource: Resource.Member, action: Action.Delete, description: 'Remove members from projects' },
  ];

  const createdPermissions = permissions.map(p => permissionRepo.create(p));
  const permissionMap = new Map(createdPermissions.map(p => [p.name, p.id]));

  // Create Admin role with all permissions
  const adminRole = roleRepo.create({
    name: SystemRole.Admin,
    description: 'Full access to all project features',
    isSystem: true,
  });

  createdPermissions.forEach(permission => {
    roleRepo.addPermission(adminRole.id, permission.id);
  });

  // Create Member role with most permissions (cannot manage members or delete projects)
  const memberRole = roleRepo.create({
    name: SystemRole.Member,
    description: 'Can create and edit content but not manage members',
    isSystem: true,
  });

  const memberPermissions = [
    buildPermissionName(Resource.Project, Action.Read),
    buildPermissionName(Resource.Project, Action.Update),
    buildPermissionName(Resource.Task, Action.Create),
    buildPermissionName(Resource.Task, Action.Read),
    buildPermissionName(Resource.Task, Action.Update),
    buildPermissionName(Resource.Task, Action.Delete),
    buildPermissionName(Resource.Comment, Action.Create),
    buildPermissionName(Resource.Comment, Action.Read),
    buildPermissionName(Resource.Comment, Action.Update),
    buildPermissionName(Resource.Comment, Action.Delete),
    buildPermissionName(Resource.Label, Action.Create),
    buildPermissionName(Resource.Label, Action.Read),
    buildPermissionName(Resource.Label, Action.Update),
    buildPermissionName(Resource.Label, Action.Delete),
    buildPermissionName(Resource.Attachment, Action.Create),
    buildPermissionName(Resource.Attachment, Action.Read),
    buildPermissionName(Resource.Attachment, Action.Delete),
    buildPermissionName(Resource.CustomField, Action.Read),
    buildPermissionName(Resource.Member, Action.Read),
  ];

  memberPermissions.forEach(permName => {
    const permId = permissionMap.get(permName);
    if (permId) {
      roleRepo.addPermission(memberRole.id, permId);
    }
  });

  // Create Viewer role with read-only permissions
  const viewerRole = roleRepo.create({
    name: SystemRole.Viewer,
    description: 'Read-only access to projects',
    isSystem: true,
  });

  const viewerPermissions = [
    buildPermissionName(Resource.Project, Action.Read),
    buildPermissionName(Resource.Task, Action.Read),
    buildPermissionName(Resource.Comment, Action.Read),
    buildPermissionName(Resource.Label, Action.Read),
    buildPermissionName(Resource.Attachment, Action.Read),
    buildPermissionName(Resource.CustomField, Action.Read),
    buildPermissionName(Resource.Member, Action.Read),
  ];

  viewerPermissions.forEach(permName => {
    const permId = permissionMap.get(permName);
    if (permId) {
      roleRepo.addPermission(viewerRole.id, permId);
    }
  });

  console.log(`Created ${createdPermissions.length} permissions`);
  console.log(`Created 3 system roles: Admin, Member, Viewer`);
}
