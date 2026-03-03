import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "./connection";

export const db = drizzle(sql);
