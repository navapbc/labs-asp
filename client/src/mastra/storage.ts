import { PostgresStore, PgVector } from "@mastra/pg";

const connectionString = process.env.DATABASE_URL!;

export const postgresStore = new PostgresStore({
	connectionString,
});

export const pgVector = new PgVector({
	connectionString,
});


