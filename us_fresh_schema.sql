-- ============================================
-- SparkStage US - Fresh Database Schema
-- Date: 2026-06-13
-- Description: Complete schema without baseline migration
-- This creates all tables in their final state without migration history
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Drop baseline migration dependency (not needed for fresh DB)
-- We'll create tables in their final UUID-based state directly

SELECT 'Schema creation will be done via Supabase Studio or manual SQL export' AS status;

-- TODO: Export actual schema from Indonesia DB using Supabase Studio
-- Go to: SQL Editor → Export Schema → Copy SQL
