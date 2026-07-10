import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load the repo-root .env explicitly. npm workspaces run server scripts with
// cwd = server/, so the default `dotenv/config` (which reads `${cwd}/.env`)
// silently misses the root .env and every API key looks "NOT set".
//
// This must be the FIRST import in index.ts: ESM evaluates a module's
// dependencies in import order before running the importing module's own
// top-level code, so as long as this is imported before ./routes/ai.js (and
// anything else that reads process.env at module load time), those modules
// will see the loaded vars.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../../.env") });
