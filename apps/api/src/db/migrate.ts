import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDbClient } from "./client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "migrations");

async function main() {
  const databaseUrl =
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5434/luxestay";

  const client = createDbClient(databaseUrl);
  try {
    console.log(`[luxestay-api] Running PostgreSQL migrations from ${migrationsFolder}...`);
    await migrate(client.db, { migrationsFolder });
    console.log("[luxestay-api] Migrations applied successfully.");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("[luxestay-api] Migration failed:", err);
  process.exit(1);
});
