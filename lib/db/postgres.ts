import pg from "pg";
import type { QueryResultRow } from "pg";

const { Pool, types } = pg;

types.setTypeParser(1700, (value) => Number.parseFloat(value));
types.setTypeParser(1082, (value) => value);
types.setTypeParser(1114, (value) => new Date(`${value}Z`).toISOString());
types.setTypeParser(1184, (value) => new Date(value).toISOString());

let pool: pg.Pool | null = null;

export function hasPostgresEnv() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPostgresPool() {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8
  });
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const client = getPostgresPool();
  if (!client) return null;
  return client.query<T>(text, params);
}

export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>) {
  const client = getPostgresPool();
  if (!client) return null;
  const connection = await client.connect();
  try {
    await connection.query("begin");
    const result = await fn(connection);
    await connection.query("commit");
    return result;
  } catch (error) {
    await connection.query("rollback");
    throw error;
  } finally {
    connection.release();
  }
}
