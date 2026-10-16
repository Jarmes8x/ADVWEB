import { Router } from 'express';
import { sendServerError } from '../middleware/auth';
import { db } from '../database/connection';
import { Order } from '../models/types';

export const orderRouter = Router();

// GET all orders with customer details
orderRouter.get('/', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT 
        o.id,
        o.orderNumber,
        o.customerId,
        o.boxCount,
        o.orderTime,
        o.status,
        o.assignedRiderId,
        o.deliverySequence,
        c.name as customerName,
        c.phone as customerPhone,
        c.address as customerAddress,
        c.zone,
        c.lat,
        c.lng
      FROM orders o
      JOIN customers c ON o.customerId = c.id
      ORDER BY o.id ASC
    `).all();
    res.json(orders);
  } catch (error) {
    sendServerError(res, error);
  }
});

// CREATE single order
orderRouter.post('/', (req, res) => {
  try {
    const { customerId, boxCount }: { customerId: number; boxCount: number } = req.body;
    if (!customerId || !boxCount || boxCount < 1 || boxCount > 3) {
      return res.status(400).json({ error: 'Valid customerId and boxCount (1-3) are required' });
    }

    const countResult = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${(countResult.count + 1).toString().padStart(2, '0')}`;

    const result = db.prepare(`
      INSERT INTO orders (orderNumber, customerId, boxCount, orderTime, status)
      VALUES (?, ?, ?, time('now', 'localtime'), 'pending')
    `).run(orderNumber, customerId, boxCount);

    const newOrder = db.prepare(`
      SELECT 
        o.*, c.name as customerName, c.phone as customerPhone, c.address as customerAddress, c.zone, c.lat, c.lng
      FROM orders o
      JOIN customers c ON o.customerId = c.id
      WHERE o.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newOrder);
  } catch (error) {
    sendServerError(res, error);
  }
});

// UPDATE order
orderRouter.put('/:id', (req, res) => {
  try {
    const { boxCount, customerId }: { boxCount?: number; customerId?: number } = req.body;
    if (boxCount !== undefined && (boxCount < 1 || boxCount > 3)) {
      return res.status(400).json({ error: 'Box count must be between 1 and 3' });
    }

    const currentOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
    if (!currentOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updatedBoxCount = boxCount !== undefined ? boxCount : currentOrder.boxCount;
    const updatedCustomerId = customerId !== undefined ? customerId : currentOrder.customerId;

    db.prepare(`
      UPDATE orders
      SET boxCount = ?, customerId = ?
      WHERE id = ?
    `).run(updatedBoxCount, updatedCustomerId, req.params.id);

    const updated = db.prepare(`
      SELECT 
        o.*, c.name as customerName, c.phone as customerPhone, c.address as customerAddress, c.zone, c.lat, c.lng
      FROM orders o
      JOIN customers c ON o.customerId = c.id
      WHERE o.id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (error) {
    sendServerError(res, error);
  }
});

// DELETE single order
orderRouter.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true, message: 'Order deleted' });
  } catch (error) {
    sendServerError(res, error);
  }
});

// GENERATE SIMULATED ORDERS (จำลองออเดอร์มื้อเที่ยง 25 - 35 รายการ)
orderRouter.post('/simulate', (req, res) => {
  try {
    const MAX_SIMULATED_ORDERS = 100;
    // No count given -> random 28-35 orders (normal lunch volume)
    const count = req.body?.count === undefined
      ? 28 + Math.floor(Math.random() * 8)
      : Number(req.body.count);
    if (!Number.isInteger(count) || count < 1 || count > MAX_SIMULATED_ORDERS) {
      return res.status(400).json({ error: `count must be an integer between 1 and ${MAX_SIMULATED_ORDERS}` });
    }
    const customers = db.prepare('SELECT id FROM customers').all() as { id: number }[];

    if (customers.length === 0) {
      return res.status(400).json({ error: 'No customers available in database' });
    }

    // Clear existing orders
    db.prepare('DELETE FROM orders').run();

    const insertOrder = db.prepare(`
      INSERT INTO orders (orderNumber, customerId, boxCount, orderTime, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);

    // Shuffle (Fisher-Yates) so each run picks different customers.
    // A customer orders at most once unless count exceeds the customer list.
    const shuffled = [...customers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Random boxes (1-3) and order time (10:00-10:45), sorted by time so
    // order numbers follow the order the orders came in
    const simulated = Array.from({ length: count }, (_, i) => ({
      customerId: shuffled[i % shuffled.length].id,
      boxes: Math.floor(Math.random() * 3) + 1,
      timeMinute: 10 * 60 + Math.floor(Math.random() * 46)
    })).sort((a, b) => a.timeMinute - b.timeMinute);

    const seedSimulated = db.transaction(() => {
      simulated.forEach((o, i) => {
        const hour = Math.floor(o.timeMinute / 60);
        const min = o.timeMinute % 60;
        const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
        const orderNum = `ORD-LUNCH-${(i + 1).toString().padStart(3, '0')}`;
        insertOrder.run(orderNum, o.customerId, o.boxes, timeStr);
      });
    });

    seedSimulated();

    const orders = db.prepare(`
      SELECT 
        o.*, c.name as customerName, c.phone as customerPhone, c.address as customerAddress, c.zone, c.lat, c.lng
      FROM orders o
      JOIN customers c ON o.customerId = c.id
      ORDER BY o.id ASC
    `).all();

    res.json({ message: `Simulated ${count} lunch orders successfully!`, orders });
  } catch (error) {
    sendServerError(res, error);
  }
});

// CLEAR all orders
orderRouter.delete('/', (req, res) => {
  try {
    db.prepare('DELETE FROM orders').run();
    res.json({ success: true, message: 'All orders cleared' });
  } catch (error) {
    sendServerError(res, error);
  }
});
