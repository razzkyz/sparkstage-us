import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY environment variables"
  );
  process.exit(1);
}

async function executeMigration() {
  try {
    console.log("🔄 Reading migration file...");
    const migrationPath = path.join(
      __dirname,
      "..",
      "supabase",
      "migrations",
      "20260523000000_add_data_cleanup_functions.sql"
    );

    const sql = fs.readFileSync(migrationPath, "utf-8");
    console.log("✅ Migration file read successfully");

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🔄 Executing migration SQL...");
    const { error } = await supabase.sql`${sql}`;

    if (error) {
      console.error("❌ Migration execution failed:", error);
      process.exit(1);
    }

    console.log("✅ Migration executed successfully!");
    console.log("📋 Verifying cleanup functions...");

    // Verify functions exist
    const functions = [
      "get_dummy_data_summary",
      "identify_dummy_products",
      "identify_test_orders",
      "identify_orders_without_doku",
      "cleanup_dummy_data",
    ];

    for (const fn of functions) {
      try {
        const { data: result } = await supabase.rpc(`${fn}`);
        console.log(`✅ Function ${fn} exists and is callable`);
      } catch (e) {
        console.error(`❌ Function ${fn} not found or not callable`);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

executeMigration();
