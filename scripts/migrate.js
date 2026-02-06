#!/usr/bin/env node

/**
 * 数据库迁移脚本 - 自动运行 Drizzle 迁移
 * Database migration script - automatically run Drizzle migrations
 */

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function runMigrations() {
  try {
    console.log('🔄 开始数据库迁移 / Starting database migration...\n');

    // 确保数据目录存在
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      console.log('📁 创建数据目录 / Creating data directory...');
      mkdirSync(dataDir, { recursive: true });
    }

    // 连接数据库
    const dbPath = join(dataDir, 'paste.db');
    console.log(`📊 连接数据库 / Connecting to database: ${dbPath}`);
    
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    const db = drizzle(sqlite);

    // 运行迁移
    console.log('⏳ 执行迁移文件 / Running migration files...');
    const migrationsFolder = join(process.cwd(), 'drizzle');
    
    migrate(db, { migrationsFolder });

    console.log('✅ 数据库迁移完成！/ Database migration completed!\n');
    
    sqlite.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败 / Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigrations();
