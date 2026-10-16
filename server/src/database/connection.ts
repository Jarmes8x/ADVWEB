import Database from 'better-sqlite3';
import path from 'path';
import { hashPassword } from '../middleware/auth';
import { inferZone } from '../models/zones';
import { SAMPLE_CUSTOMERS } from './sampleCustomers';

// Vercel's filesystem is read-only except /tmp (data resets when the function restarts)
const dbPath = process.env.VERCEL
  ? '/tmp/database.sqlite'
  : path.resolve(__dirname, '../../database.sqlite');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// 13 Distinct Rider Colors for visual clarity on map
export const RIDER_COLORS = [
  '#E6194B', // Red
  '#3CBA54', // Green
  '#0082C8', // Blue
  '#F58231', // Orange
  '#911EB4', // Purple
  '#46F0F0', // Cyan
  '#F032E6', // Magenta
  '#BCF60C', // Lime
  '#FABEBE', // Pink
  '#008080', // Teal
  '#E6BEFF', // Lavender
  '#9A6324', // Brown
  '#800000'  // Maroon
];

export const SHOP_LOCATION = {
  name: 'ร้านข้าวกล่องเดลิเวอรี่ (หน้า ม.มหาสารคาม มมส.ใหม่ ขามเรียง)',
  lat: 16.2465,
  lng: 103.2505
};

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      zone TEXT NOT NULL DEFAULT 'ขามเรียง' CHECK(zone IN ('ขามเรียง', 'ท่าขอนยาง', 'หน้าป้าย'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderNumber TEXT NOT NULL UNIQUE,
      customerId INTEGER NOT NULL,
      boxCount INTEGER NOT NULL CHECK(boxCount >= 1 AND boxCount <= 3),
      orderTime TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending',
      assignedRiderId INTEGER,
      deliverySequence INTEGER,
      FOREIGN KEY(customerId) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS riders (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      color TEXT NOT NULL,
      maxOrders INTEGER DEFAULT 3,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'rider')),
      riderId INTEGER,
      FOREIGN KEY(riderId) REFERENCES riders(id)
    );
  `);

  migrateCustomerZones();

  // Seed 13 Fixed Riders if not existing
  const riderCount = db.prepare('SELECT COUNT(*) as count FROM riders').get() as { count: number };
  if (riderCount.count === 0) {
    const insertRider = db.prepare(`
      INSERT INTO riders (id, name, phone, color, maxOrders, status)
      VALUES (?, ?, ?, ?, 3, 'active')
    `);

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

    const seedRiders = db.transaction(() => {
      riderNames.forEach((name, i) => {
        insertRider.run(i + 1, name, `089-111-20${(i + 1).toString().padStart(2, '0')}`, RIDER_COLORS[i]);
      });
    });
    seedRiders();
  }

  seedSampleCustomers();

  seedUsers();
}

const INITIAL_ORDER_COUNT = 30;

// Seed sample dorm customers (see sampleCustomers.ts) and, on a fresh database, a first batch of orders.
// Older databases had 30 customers with inaccurate coordinates (phone 081-234-56xx);
// those are replaced once. Customers added by users are never touched.
function seedSampleCustomers() {
  const isFreshDb = (db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number }).count === 0;

  db.transaction(() => {
    const oldSampleIds = db.prepare(`SELECT id FROM customers WHERE phone LIKE '081-234-56__'`).all() as { id: number }[];
    if (oldSampleIds.length > 0) {
      const deleteOrders = db.prepare('DELETE FROM orders WHERE customerId = ?');
      const deleteCustomer = db.prepare('DELETE FROM customers WHERE id = ?');
      for (const { id } of oldSampleIds) {
        deleteOrders.run(id);
        deleteCustomer.run(id);
      }
    }

    // Insert only sample customers that are missing, so restarts don't create duplicates
    const existingNames = new Set(
      (db.prepare('SELECT name FROM customers').all() as { name: string }[]).map(r => r.name)
    );
    const insertCustomer = db.prepare(`
      INSERT INTO customers (name, phone, address, lat, lng, zone)
      VALUES (@name, @phone, @address, @lat, @lng, @zone)
    `);
    for (const c of SAMPLE_CUSTOMERS) {
      if (!existingNames.has(c.name)) insertCustomer.run(c);
    }
  })();

  if (isFreshDb) {
    const ids = (db.prepare('SELECT id FROM customers ORDER BY id').all() as { id: number }[]).map(r => r.id);
    // Every other customer, so the first batch is spread over all three zones
    const picked = ids.filter((_, i) => i % 2 === 0).slice(0, INITIAL_ORDER_COUNT);
    const insertOrder = db.prepare(`
      INSERT INTO orders (orderNumber, customerId, boxCount, orderTime, status)
      VALUES (?, ?, ?, '10:15:00', 'pending')
    `);
    db.transaction(() => {
      picked.forEach((customerId, idx) => {
        const orderNum = `ORD-20261003-${(idx + 1).toString().padStart(3, '0')}`;
        insertOrder.run(orderNum, customerId, (idx % 3) + 1);
      });
    })();
  }
}

// Databases created before zones existed: add the column and fill it in once
function migrateCustomerZones() {
  const columns = db.prepare('PRAGMA table_info(customers)').all() as { name: string }[];
  if (columns.some(c => c.name === 'zone')) return;

  db.exec(`ALTER TABLE customers ADD COLUMN zone TEXT NOT NULL DEFAULT 'ขามเรียง'`);
  const rows = db.prepare('SELECT id, address, lat, lng FROM customers').all() as
    { id: number; address: string; lat: number; lng: number }[];
  const update = db.prepare('UPDATE customers SET zone = ? WHERE id = ?');
  db.transaction(() => {
    for (const r of rows) update.run(inferZone(r.lat, r.lng, r.address), r.id);
  })();
}

// Seed login accounts: 1 admin + 1 account per rider (rider01..rider13)
function seedUsers() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) return;

  const isProduction = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
  const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? '' : 'admin1234');
  const riderPassword = process.env.RIDER_PASSWORD || (isProduction ? '' : 'rider1234');
  if (!adminPassword || !riderPassword) {
    throw new Error('ADMIN_PASSWORD and RIDER_PASSWORD environment variables are required in production');
  }

  const insertUser = db.prepare(`
    INSERT INTO users (username, passwordHash, role, riderId) VALUES (?, ?, ?, ?)
  `);
  const riders = db.prepare('SELECT id FROM riders ORDER BY id ASC').all() as { id: number }[];

  db.transaction(() => {
    insertUser.run('admin', hashPassword(adminPassword), 'admin', null);
    for (const r of riders) {
      insertUser.run(`rider${r.id.toString().padStart(2, '0')}`, hashPassword(riderPassword), 'rider', r.id);
    }
  })();
}
