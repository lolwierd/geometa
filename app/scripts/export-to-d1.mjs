#!/usr/bin/env node
// Data migration script: SQLite → Cloudflare D1
// Exports existing data from better-sqlite3 and prepares it for D1 import

import Database from 'better-sqlite3';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

async function exportSQLiteData() {
  const dbPath = join(process.cwd(), 'db/geometa.db');
  
  console.log('🔄 Starting SQLite → D1 data export...');
  console.log(`📁 Database path: ${dbPath}`);

  if (!existsSync(dbPath)) {
    console.error('❌ SQLite database not found. Run `npm run db:init` first.');
    process.exit(1);
  }

  // Open SQLite database
  const db = new Database(dbPath, { readonly: true });
  
  try {
    // Export locations table
    console.log('📊 Exporting locations...');
    const locations = db.prepare('SELECT * FROM locations ORDER BY id').all();
    console.log(`✅ Found ${locations.length} locations`);

    // Export memorizer_progress table
    console.log('📊 Exporting memorizer progress...');
    const memorizerProgress = db.prepare('SELECT * FROM memorizer_progress ORDER BY id').all();
    console.log(`✅ Found ${memorizerProgress.length} memorizer progress records`);

    // Export memorizer_reviews table (if it exists)
    console.log('📊 Exporting memorizer reviews...');
    let memorizerReviews = [];
    try {
      memorizerReviews = db.prepare('SELECT * FROM memorizer_reviews ORDER BY id').all();
      console.log(`✅ Found ${memorizerReviews.length} memorizer review records`);
    } catch (error) {
      console.log('ℹ️ No memorizer_reviews table found (this is okay for older databases)');
    }

    // Generate D1 import SQL
    console.log('📝 Generating D1 import SQL...');
    
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        sourceDatabase: 'SQLite (better-sqlite3)',
        targetDatabase: 'Cloudflare D1',
        totalRecords: {
          locations: locations.length,
          memorizerProgress: memorizerProgress.length,
          memorizerReviews: memorizerReviews.length
        }
      },
      locations,
      memorizerProgress,
      memorizerReviews
    };

    // Write JSON export
    const jsonExportPath = join(process.cwd(), 'db/export-data.json');
    writeFileSync(jsonExportPath, JSON.stringify(exportData, null, 2));
    console.log(`✅ JSON export saved to: ${jsonExportPath}`);

    // Generate SQL INSERT statements for D1
    let sqlStatements = [
      '-- Data migration from SQLite to Cloudflare D1',
      `-- Export date: ${new Date().toISOString()}`,
      `-- Total records: ${locations.length} locations, ${memorizerProgress.length} memorizer progress`,
      '',
      '-- Insert locations'
    ];

    // Locations inserts
    for (const location of locations) {
      const values = [
        location.id,
        escapeString(location.pano_id),
        escapeString(location.map_id),
        escapeString(location.country),
        location.country_code ? escapeString(location.country_code) : 'NULL',
        location.meta_name ? escapeString(location.meta_name) : 'NULL',
        location.note ? escapeString(location.note) : 'NULL',
        location.footer ? escapeString(location.footer) : 'NULL',
        escapeString(location.images),
        escapeString(location.raw_data),
        escapeString(location.created_at),
        escapeString(location.updated_at)
      ];

      sqlStatements.push(
        `INSERT INTO locations (id, pano_id, map_id, country, country_code, meta_name, note, footer, images, raw_data, created_at, updated_at) VALUES (${values.join(', ')});`
      );
    }

    // Memorizer progress inserts
    if (memorizerProgress.length > 0) {
      sqlStatements.push('', '-- Insert memorizer progress');
      
      for (const progress of memorizerProgress) {
        const values = [
          progress.id,
          progress.location_id,
          progress.repetitions,
          progress.ease_factor,
          progress.interval,
          progress.due_date,
          escapeString(progress.state),
          progress.lapses,
          escapeString(progress.created_at),
          escapeString(progress.updated_at)
        ];

        sqlStatements.push(
          `INSERT INTO memorizer_progress (id, location_id, repetitions, ease_factor, "interval", due_date, state, lapses, created_at, updated_at) VALUES (${values.join(', ')});`
        );
      }
    }

    // Memorizer reviews inserts
    if (memorizerReviews.length > 0) {
      sqlStatements.push('', '-- Insert memorizer reviews');
      
      for (const review of memorizerReviews) {
        const values = [
          review.id,
          review.location_id,
          review.quality,
          review.reviewed_at,
          escapeString(review.created_at)
        ];

        sqlStatements.push(
          `INSERT INTO memorizer_reviews (id, location_id, quality, reviewed_at, created_at) VALUES (${values.join(', ')});`
        );
      }
    }

    // Write SQL export
    const sqlExportPath = join(process.cwd(), 'db/export-data.sql');
    writeFileSync(sqlExportPath, sqlStatements.join('\n'));
    console.log(`✅ SQL export saved to: ${sqlExportPath}`);

    console.log('');
    console.log('🎉 Data export completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Create D1 database: wrangler d1 create geometa-gallery');
    console.log('2. Run schema migration: wrangler d1 execute geometa-gallery --file=db/schema-d1.sql');
    console.log('3. Import data: wrangler d1 execute geometa-gallery --file=db/export-data.sql');
    console.log('4. Update wrangler.toml with your database ID');

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Helper function to escape SQL strings
function escapeString(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'string') {
    // Escape single quotes by doubling them
    return `'${value.replace(/'/g, "''")}'`;
  }
  
  return String(value);
}

// Run export if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exportSQLiteData().catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}