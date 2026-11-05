import { getDatabase } from './db';

export async function initDatabase(): Promise<void> {
  const db = getDatabase();
  console.log('[PostgreSQL] Initializing database tables...');

  try {
    // 1. Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create chats table
    await db.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id VARCHAR(64) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create chat_members junction table
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_members (
        chat_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (chat_id, user_id),
        CONSTRAINT fk_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 4. Index on chat_members(user_id) for fast user chat queries
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);
    `);

    console.log('[PostgreSQL] Database tables initialized successfully.');
  } catch (error) {
    console.error('[PostgreSQL] Failed to initialize database tables:', error);
    throw error;
  }
}

// Allow standalone execution via `npm run db:init`
if (require.main === module) {
  initDatabase()
    .then(async () => {
      console.log('[PostgreSQL] Setup complete.');
      const db = getDatabase();
      await db.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[PostgreSQL] Error running init script:', err);
      process.exit(1);
    });
}
