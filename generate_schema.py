#!/usr/bin/env python3
"""
Generate PostgreSQL CREATE TABLE statements from TypeScript database.types.ts
This creates a fresh base schema for SparkStage US database
"""

import re
import json

# Type mapping from TypeScript to PostgreSQL
TYPE_MAP = {
    'string': 'TEXT',
    'number': 'BIGINT',
    'boolean': 'BOOLEAN',
    'Json': 'JSONB',
    'unknown': 'INET',  # For IP addresses
    'string[]': 'TEXT[]',
    'number[]': 'BIGINT[]',
}

def parse_typescript_types(file_path):
    """Parse database.types.ts and extract table definitions"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all table definitions
    tables = {}
    
    # Pattern to match table name and Row definition
    table_pattern = r'(\w+):\s*{\s*Row:\s*{([^}]+)}'
    
    for match in re.finditer(table_pattern, content, re.DOTALL):
        table_name = match.group(1)
        row_content = match.group(2)
        
        # Parse columns from Row
        columns = {}
        col_pattern = r'(\w+):\s*([^\n]+)'
        
        for col_match in re.finditer(col_pattern, row_content):
            col_name = col_match.group(1)
            col_type_raw = col_match.group(2).strip()
            
            # Determine if nullable
            nullable = '| null' in col_type_raw
            
            # Map TypeScript type to PostgreSQL
            pg_type = 'TEXT'  # default
            if 'string' in col_type_raw:
                if '[]' in col_type_raw:
                    pg_type = 'TEXT[]'
                else:
                    pg_type = 'TEXT'
            elif 'number' in col_type_raw:
                if '[]' in col_type_raw:
                    pg_type = 'BIGINT[]'
                else:
                    pg_type = 'BIGINT'
            elif 'boolean' in col_type_raw:
                pg_type = 'BOOLEAN'
            elif 'Json' in col_type_raw:
                pg_type = 'JSONB'
            elif 'unknown' in col_type_raw:
                pg_type = 'INET'
            
            columns[col_name] = {
                'type': pg_type,
                'nullable': nullable
            }
        
        if columns:
            tables[table_name] = columns
    
    return tables

def generate_create_table(table_name, columns):
    """Generate CREATE TABLE statement"""
    sql = f"CREATE TABLE IF NOT EXISTS public.{table_name} (\n"
    
    col_defs = []
    for col_name, col_info in columns.items():
        col_def = f"  {col_name} {col_info['type']}"
        
        # Primary key detection
        if col_name == 'id':
            if col_info['type'] == 'BIGINT':
                col_def = f"  {col_name} BIGSERIAL PRIMARY KEY"
            elif col_info['type'] == 'TEXT':
                col_def = f"  {col_name} UUID PRIMARY KEY DEFAULT gen_random_uuid()"
        else:
            # NOT NULL constraint
            if not col_info['nullable']:
                col_def += " NOT NULL"
            
            # Defaults for common columns
            if col_name in ['created_at', 'updated_at'] and col_info['type'] == 'TEXT':
                col_def = f"  {col_name} TIMESTAMPTZ DEFAULT NOW()"
            elif col_name == 'is_active' and col_info['type'] == 'BOOLEAN':
                col_def += " DEFAULT true"
        
        col_defs.append(col_def)
    
    sql += ",\n".join(col_defs)
    sql += "\n);\n"
    
    return sql

def main():
    print("Generating base schema from TypeScript types...")
    
    # Parse TypeScript file
    tables = parse_typescript_types('frontend/src/types/database.types.ts')
    
    print(f"Found {len(tables)} tables")
    
    # Generate SQL
    sql_output = []
    sql_output.append("-- ============================================")
    sql_output.append("-- SparkStage US - Base Schema")
    sql_output.append("-- Generated from database.types.ts")
    sql_output.append("-- Date: 2026-06-13")
    sql_output.append("-- ============================================\n")
    
    sql_output.append("-- Enable required extensions")
    sql_output.append("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
    sql_output.append("CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";")
    sql_output.append("CREATE EXTENSION IF NOT EXISTS \"btree_gin\";\n")
    
    # Sort tables alphabetically
    for table_name in sorted(tables.keys()):
        columns = tables[table_name]
        sql = generate_create_table(table_name, columns)
        sql_output.append(sql)
    
    # Write to file
    output_file = 'supabase/migrations/20260613000000_us_base_schema.sql'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_output))
    
    print(f"✅ Generated: {output_file}")
    print(f"📊 Total tables: {len(tables)}")

if __name__ == '__main__':
    main()
