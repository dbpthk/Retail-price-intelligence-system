import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://localhost:5432/postgres";

export const sql = postgres(connectionString, {
  prepare: false,
  max: 10,
});
