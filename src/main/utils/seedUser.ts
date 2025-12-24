import Database from 'better-sqlite3';
import { UserRepository } from '../repositories/UserRepository';

/**
 * Seed default user if none exists
 */
export function seedDefaultUser(db: Database.Database): void {
    const userRepo = new UserRepository(db);

    // Check if any user exists
    const existingUsers = userRepo.findAll();
    if (existingUsers.length > 0) {
        console.log('Users already seeded, skipping...');
        return;
    }

    console.log('Seeding default user...');

    try {
        const user = userRepo.create({
            username: 'admin',
            email: 'admin@devtrack.local',
            displayName: 'Admin User',
            isActive: true,
        });
        console.log('✅ Default user created:', user);
    } catch (error) {
        console.error('❌ Failed to seed default user:', error);
    }
}
