import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "./connection";
import * as schema from "./schema";

export const db = drizzle(sql, { schema });
