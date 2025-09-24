#!/usr/bin/env node
// Migration utility: Switch between SQLite and Cloudflare D1 modes

import { existsSync, renameSync, copyFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const API_ROUTES = [
  'src/app/api/gallery/route.ts',
  'src/app/api/collect/route.js', 
  'src/app/api/memorizer/route.ts',
  'src/app/api/stats/route.ts',
  'src/app/api/meta/[id]/route.ts'
];

const D1_ROUTES = [
  'src/app/api/gallery/route-d1.ts',
  'src/app/api/collect/route-d1.js',
  'src/app/api/memorizer/route-d1.ts', 
  'src/app/api/stats/route-d1.ts',
  'src/app/api/meta/[id]/route-d1.ts'
];

function backupFiles(suffix) {
  console.log(`🔄 Creating backups with suffix: ${suffix}`);
  
  API_ROUTES.forEach(route => {
    const filePath = join(process.cwd(), route);
    const backupPath = filePath + suffix;
    
    if (existsSync(filePath)) {
      copyFileSync(filePath, backupPath);
      console.log(`   ✅ Backed up: ${route}`);
    }
  });
}

function restoreFiles(suffix) {
  console.log(`🔄 Restoring files from backup: ${suffix}`);
  
  API_ROUTES.forEach(route => {
    const filePath = join(process.cwd(), route);
    const backupPath = filePath + suffix;
    
    if (existsSync(backupPath)) {
      copyFileSync(backupPath, filePath);
      console.log(`   ✅ Restored: ${route}`);
    }
  });
}

function switchToD1() {
  console.log('🚀 Switching to Cloudflare D1 mode...');
  
  // Backup current SQLite files
  backupFiles('.sqlite-backup');
  
  // Replace with D1 versions
  API_ROUTES.forEach((route, index) => {
    const currentPath = join(process.cwd(), route);
    const d1Path = join(process.cwd(), D1_ROUTES[index]);
    
    if (existsSync(d1Path)) {
      copyFileSync(d1Path, currentPath);
      console.log(`   ✅ Activated D1: ${route}`);
    } else {
      console.log(`   ⚠️ D1 version not found: ${D1_ROUTES[index]}`);
    }
  });
  
  console.log('');
  console.log('🎉 Successfully switched to D1 mode!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Set up D1 database: wrangler d1 create geometa-gallery');
  console.log('2. Update wrangler.toml with database ID');
  console.log('3. Apply schema: wrangler d1 execute geometa-gallery --file=db/schema-d1.sql');
  console.log('4. Export data: npm run cloudflare:export');
  console.log('5. Import data: wrangler d1 execute geometa-gallery --file=db/export-data.sql');
  console.log('6. Test: wrangler dev --local');
}

function switchToSQLite() {
  console.log('🔙 Switching back to SQLite mode...');
  
  // Restore SQLite files from backup
  restoreFiles('.sqlite-backup');
  
  console.log('');
  console.log('🎉 Successfully switched to SQLite mode!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Initialize database: npm run db:init');
  console.log('2. Start development: npm run dev');
}

function showStatus() {
  console.log('📊 Current API Route Status:');
  console.log('');
  
  const sqliteRoute = join(process.cwd(), 'src/app/api/gallery/route.ts');
  const d1Route = join(process.cwd(), 'src/app/api/gallery/route-d1.ts');
  
  if (!existsSync(sqliteRoute)) {
    console.log('❌ No active API routes found');
    return;
  }
  
  // Check if current routes are D1 or SQLite by looking for D1QueryBuilder import
  import('fs').then(fs => {
    const routeContent = fs.readFileSync(sqliteRoute, 'utf8');
    
    if (routeContent.includes('D1QueryBuilder')) {
      console.log('✅ Currently using: **Cloudflare D1**');
      console.log('   - Database: Cloudflare D1');
      console.log('   - Runtime: Edge');
      console.log('   - Search: LIKE-based queries');
    } else {
      console.log('✅ Currently using: **SQLite (better-sqlite3)**');
      console.log('   - Database: Local SQLite');
      console.log('   - Runtime: Node.js');  
      console.log('   - Search: FTS5 virtual tables');
    }
    
    console.log('');
    console.log('Available commands:');
    console.log('  npm run migrate:d1     - Switch to D1 mode');
    console.log('  npm run migrate:sqlite - Switch to SQLite mode');
    console.log('  npm run migrate:status - Show current mode');
  });
}

async function main() {
  const command = process.argv[2];
  
  console.log('🔄 GeoMeta Gallery Database Migration Utility');
  console.log('==============================================');
  console.log('');
  
  switch (command) {
    case 'd1':
    case 'cloudflare':
      switchToD1();
      break;
      
    case 'sqlite':
    case 'local':  
      switchToSQLite();
      break;
      
    case 'status':
      showStatus();
      break;
      
    default:
      console.log('Usage: node scripts/migrate.mjs <command>');
      console.log('');
      console.log('Commands:');
      console.log('  d1        Switch to Cloudflare D1 mode');
      console.log('  sqlite    Switch to SQLite mode');
      console.log('  status    Show current configuration');
      console.log('');
      console.log('Examples:');
      console.log('  npm run migrate:d1');
      console.log('  npm run migrate:sqlite');
      console.log('  npm run migrate:status');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});