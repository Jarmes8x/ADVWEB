"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRouter = void 0;
const express_1 = require("express");
const connection_1 = require("../database/connection");
exports.orderRouter = (0, express_1.Router)();
// GET all orders with customer details
exports.orderRouter.get('/', (req, res) => {
    try {
        const orders = connection_1.db.prepare(`
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
        c.lat,
        c.lng
      FROM orders o
      JOIN customers c ON o.customerId = c.id
      ORDER BY o.id ASC
    `).all();
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// CREATE single order
exports.orderRouter.post('/', (req, res) => {
    try {
        const { customerId, boxCount } = req.body;
        if (!customerId || !boxCount || boxCount < 1 || boxCount > 3) {
            return res.status(400).json({ error: 'Valid customerId and boxCount (1-3) are required' });
        }
        const countResult = connection_1.db.prepare('SELECT COUNT(*) as count FROM orders').get();
        const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${(countResult.count + 1).toString().padStart(2, '0')}`;
        const result = connection_1.db.prepare(`
      INSERT INTO orders (orderNumber, customerId, boxCount, orderTime, status)
      VALUES (?, ?, ?, time('now', 'localtime'), 'pending')
    `).run(orderNumber, customerId, boxCount);
        const newOrder = connection_1.db.prepare(`
      SELECT 
        o.*, c.name as customerName, c.phone as customerPhone, c.address as customerAddress, c.lat, c.lng
      FROM orders o
      JOIN customers c ON o.customerId = c.id
      WHERE o.id = ?
    `).get(result.lastInsertRowid);
        res.status(201).json(newOrder);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// UPDATE order
exports.orderRouter.put('/:id', (req, res) => {
    try {
        const { boxCount, customerId } = req.body;
        if (boxCount !== undefined && (boxCount < 1 || boxCount > 3)) {
            return res.status(400).json({ error: 'Box count must be between 1 and 3' });
        }
        const currentOrder = connection_1.db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
        if (!currentOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const updatedBoxCount = boxCount !== undefined ? boxCount : currentOrder.boxCount;
        const updatedCustomerId = customerId !== undefined ? customerId : currentOrder.customerId;
        connection_1.db.prepare(`
      UPDATE orders
      SET boxCount = ?, customerId = ?
      WHERE id = ?
    `).run(updatedBoxCount, updatedCustomerId, req.params.id);
        const updated = connection_1.db.prepare(`
      SELECT 
        o.*, c.name as customerName, c.phone as customerPhone, c.address as customerAddress, c.lat, c.lng
      FROM orders o
      JOIN customers c ON o.customerId = c.id
      WHERE o.id = ?
    `).get(req.params.id);
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// DELETE single order
exports.orderRouter.delete('/:id', (req, res) => {
    try {
        const result = connection_1.db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ success: true, message: 'Order deleted' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GENERATE SIMULATED ORDERS (จำลองออเดอร์มื้อเที่ยง 25 - 35 รายการ)
exports.orderRouter.post('/simulate', (req, res) => {
    try {
        const count = Number(req.body.count) || 28; // Default 28 orders for lunch rush
        const customers = connection_1.db.prepare('SELECT id FROM customers').all();
        if (customers.length === 0) {
            return res.status(400).json({ error: 'No customers available in database' });
        }
        // Clear existing orders
        connection_1.db.prepare('DELETE FROM orders').run();
        const insertOrder = connection_1.db.prepare(`
      INSERT INTO orders (orderNumber, customerId, boxCount, orderTime, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);
        const seedSimulated = connection_1.db.transaction(() => {
            for (let i = 0; i < count; i++) {
                const randomCustomer = customers[i % customers.length];
                // 1 to 3 boxes per order
                const boxes = Math.floor(Math.random() * 3) + 1;
                const timeMinute = 10 * 60 + Math.floor(Math.random() * 45); // 10:00 - 10:45 AM
                const hour = Math.floor(timeMinute / 60);
                const min = timeMinute % 60;
                const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
                const orderNum = `ORD-LUNCH-${(i + 1).toString().padStart(3, '0')}`;
                insertOrder.run(orderNum, randomCustomer.id, boxes, timeStr);
            }
        });
        seedSimulated();
        const orders = connection_1.db.prepare(`
      SELECT 
        o.*, c.name as customerName, c.phone as customerPhone, c.address as customerAddress, c.lat, c.lng
      FROM orders o
      JOIN customers c ON o.customerId = c.id
      ORDER BY o.id ASC
    `).all();
        res.json({ message: `Simulated ${count} lunch orders successfully!`, orders });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// CLEAR all orders
exports.orderRouter.delete('/', (req, res) => {
    try {
        connection_1.db.prepare('DELETE FROM orders').run();
        res.json({ success: true, message: 'All orders cleared' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
