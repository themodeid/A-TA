import { Pool } from "pg";
import { ENV } from "../config/env";

export const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
});
