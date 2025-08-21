import { Pool, PoolClient } from 'pg';

const globalForPg = global as unknown as { 
  pgPool: Pool | undefined
}

export const pgPool = globalForPg.pgPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pgPool
}

// Helper function to get a client from the pool
export const getDbClient = async (): Promise<PoolClient> => {
  return await pgPool.connect();
};

// Helper function to execute queries with automatic client management
export const query = async (text: string, params?: any[]) => {
  const client = await getDbClient();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

export default pgPool;