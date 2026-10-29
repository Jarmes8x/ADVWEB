import 'dotenv/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { hashPassword } from './jwtauth';
import { inferZone } from './model/zones';
import { SAMPLE_CUSTOMERS } from './seed/sample-customers';
import { SCHEMA_SQL } from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy server/.env.example to server/.env and provide your Neon PostgreSQL connection string, e.g.\n' +
    'DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require"'
  );
}

function resolveSsl(url: string) {
  if (/sslmode=|uselibpqcompat=/i.test(url)) return undefined;
  if (/@(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(url)) return false;
  return { rejectUnauthorized: true };
}

export const pool = new Pool({
  connectionString,
  ssl: resolveSsl(connectionString),
  max: Number(process.env.PGPOOL_MAX) || (process.env.VERCEL ? 3 : 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err.message);
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export const RIDER_COLORS = [
  '#E6194B',
  '#3CBA54',
  '#0082C8',
  '#F58231',
  '#911EB4',
  '#46F0F0',
  '#F032E6',
  '#BCF60C',
  '#FABEBE',
  '#008080',
  '#E6BEFF',
  '#9A6324',
  '#800000'
];

export const SHOP_LOCATION = {
  name: 'ร้านข้าวกล่องเดลิเวอรี่ (หน้า ม.มหาสารคาม มมส.ใหม่ ขามเรียง)',
  lat: 16.2465,
  lng: 103.2505
};

const INIT_LOCK_KEY = 727201;

const INITIAL_ORDER_COUNT = 30;

export async function initDatabase() {
  await transaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [INIT_LOCK_KEY]);

    await client.query(SCHEMA_SQL);

    const riderCount = await client.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM riders'
    );
    if (riderCount.rows[0].count === 0) {
      const riderNames = [
        'ไรเดอร์ สมชาย (เบอร์ 1)',
        'ไรเดอร์ ชัยวัฒน์ (เบอร์ 2)',
        'ไรเดอร์ อานนท์ (เบอร์ 3)',
        'ไรเดอร์ ธีรพงษ์ (เบอร์ 4)',
        'ไรเดอร์ ณัฐวุฒิ (เบอร์ 5)',
        'ไรเดอร์ ประวิทย์ (เบอร์ 6)',
        'ไรเดอร์ สันติ (เบอร์ 7)',
        'ไรเดอร์ เกียรติศักดิ์ (เบอร์ 8)',
        'ไรเดอร์ วรวุฒิ (เบอร์ 9)',
        'ไรเดอร์ อนุชา (เบอร์ 10)',
        'ไรเดอร์ ธนากร (เบอร์ 11)',
        'ไรเดอร์ กิตติพงษ์ (เบอร์ 12)',
        'ไรเดอร์ ศักดิ์ดา (เบอร์ 13)'
      ];

      for (let i = 0; i < riderNames.length; i++) {
        await client.query(
          `INSERT INTO riders (id, name, phone, color, "maxOrders", status)
           VALUES ($1, $2, $3, $4, 3, 'active')`,
          [i + 1, riderNames[i], `089-111-20${(i + 1).toString().padStart(2, '0')}`, RIDER_COLORS[i]]
        );
      }
    }

    await seedSampleCustomers(client);
    await migrateCustomerZones(client);
    await seedUsers(client);
  });
}

async function seedSampleCustomers(client: PoolClient) {
  const { rows: [{ count }] } = await client.query<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM customers'
  );
  const isFreshDb = count === 0;

  const oldBlock = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM customers WHERE phone LIKE '081-234-56__'`
  );
  if (oldBlock.rows[0].count >= 20) {
    const oldSamples = await client.query<{ id: number }>(
      `SELECT id FROM customers WHERE phone LIKE '081-234-56__'`
    );
    for (const { id } of oldSamples.rows) {
      await client.query('DELETE FROM orders WHERE "customerId" = $1', [id]);
      await client.query('DELETE FROM customers WHERE id = $1', [id]);
    }
  }

  const existing = await client.query<{ name: string }>('SELECT name FROM customers');
  const existingNames = new Set(existing.rows.map((r) => r.name));
  for (const c of SAMPLE_CUSTOMERS) {
    if (existingNames.has(c.name)) continue;
    await client.query(
      `INSERT INTO customers (name, phone, address, lat, lng, zone)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [c.name, c.phone, c.address, c.lat, c.lng, c.zone]
    );
  }

  if (isFreshDb) {
    const ids = (await client.query<{ id: number }>('SELECT id FROM customers ORDER BY id')).rows
      .map((r) => r.id);
    const picked = ids.filter((_, i) => i % 2 === 0).slice(0, INITIAL_ORDER_COUNT);
    for (let idx = 0; idx < picked.length; idx++) {
      const orderNum = `ORD-20261003-${(idx + 1).toString().padStart(3, '0')}`;
      await client.query(
        `INSERT INTO orders ("orderNumber", "customerId", "boxCount", "orderTime", status)
         VALUES ($1, $2, $3, '10:15:00', 'pending')`,
        [orderNum, picked[idx], (idx % 3) + 1]
      );
    }
  }
}

async function migrateCustomerZones(client: PoolClient) {
  const { rows } = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'zone'
     ) AS exists`
  );
  if (rows[0].exists) return;

  await client.query(`ALTER TABLE customers ADD COLUMN zone TEXT NOT NULL DEFAULT 'ขามเรียง'`);
  const customers = await client.query<{ id: number; address: string; lat: number; lng: number }>(
    'SELECT id, address, lat, lng FROM customers'
  );
  for (const r of customers.rows) {
    await client.query('UPDATE customers SET zone = $1 WHERE id = $2',
      [inferZone(r.lat, r.lng, r.address), r.id]);
  }
}

async function seedUsers(client: PoolClient) {
  const { rows: [{ count }] } = await client.query<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM users'
  );
  if (count > 0) return;

  const isProduction = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
  const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? '' : 'admin1234');
  const riderPassword = process.env.RIDER_PASSWORD || (isProduction ? '' : 'rider1234');
  if (!adminPassword || !riderPassword) {
    throw new Error('ADMIN_PASSWORD and RIDER_PASSWORD environment variables are required in production');
  }

  const riders = await client.query<{ id: number }>('SELECT id FROM riders ORDER BY id ASC');
  await client.query(
    `INSERT INTO users (username, "passwordHash", role, "riderId") VALUES ($1, $2, $3, $4)`,
    ['admin', hashPassword(adminPassword), 'admin', null]
  );
  for (const r of riders.rows) {
    await client.query(
      `INSERT INTO users (username, "passwordHash", role, "riderId") VALUES ($1, $2, $3, $4)`,
      [`rider${r.id.toString().padStart(2, '0')}`, hashPassword(riderPassword), 'rider', r.id]
    );
  }
}
