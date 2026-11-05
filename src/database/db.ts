import { Pool, PoolClient } from 'pg';
import { config } from '../config/env';

export interface DatabaseAdapter {
  query<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
  getClient(): Promise<PoolClient>;
  close(): Promise<void>;
}

class PostgresAdapter implements DatabaseAdapter {
  private pool: Pool;

  constructor() {
    if (config.db.url) {
      this.pool = new Pool({ connectionString: config.db.url });
    } else {
      this.pool = new Pool({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database
      });
    }

    this.pool.on('error', (err) => {
      console.error('[PostgreSQL Error] Unexpected error on idle client:', err);
    });
  }

  async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

let dbInstance: DatabaseAdapter | null = null;

export function getDatabase(): DatabaseAdapter {
  if (!dbInstance) {
    dbInstance = new PostgresAdapter();
  }
  return dbInstance;
}
