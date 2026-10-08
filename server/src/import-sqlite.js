require('dotenv').config();

const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const prisma = require('./prisma');

const sqlitePath = path.resolve(process.env.SQLITE_PATH || path.join(__dirname, '../prisma/dev.db'));
const TABLES = ['Team', 'Match', 'News', 'Admin'];

function readRows(database, table) {
  const rows = database.prepare(`SELECT * FROM "${table}" ORDER BY "id"`).all();
  return rows.map((row) => {
    for (const field of ['createdAt', ...(table === 'Match' ? ['matchDate'] : [])]) {
      if (row[field] !== null && row[field] !== undefined) row[field] = new Date(row[field]);
    }
    return row;
  });
}

async function importSqlite() {
  const source = new DatabaseSync(sqlitePath, { readOnly: true });
  try {
    const rows = Object.fromEntries(TABLES.map((table) => [table, readRows(source, table)]));
    const currentCounts = await Promise.all([
      prisma.team.count(),
      prisma.match.count(),
      prisma.news.count(),
      prisma.admin.count(),
    ]);
    if (currentCounts.some((count) => count > 0)) {
      throw new Error('Target PostgreSQL database is not empty. Import stopped to protect existing records.');
    }

    await prisma.$transaction(async (transaction) => {
      if (rows.Team.length) await transaction.team.createMany({ data: rows.Team });
      if (rows.Match.length) await transaction.match.createMany({ data: rows.Match });
      if (rows.News.length) await transaction.news.createMany({ data: rows.News });
      if (rows.Admin.length) await transaction.admin.createMany({ data: rows.Admin });

      for (const table of TABLES) {
        await transaction.$queryRawUnsafe(
          `SELECT setval('"${table}_id_seq"', COALESCE((SELECT MAX("id") FROM "${table}"), 1), EXISTS(SELECT 1 FROM "${table}"))`
        );
      }
    });

    console.log(`Imported SQLite data from ${sqlitePath}: ${rows.Team.length} teams, ${rows.Match.length} matches, ${rows.News.length} news items, ${rows.Admin.length} admins.`);
  } finally {
    source.close();
    await prisma.$disconnect();
  }
}

importSqlite().catch((error) => {
  console.error('SQLite import failed:', error.message);
  process.exitCode = 1;
});
