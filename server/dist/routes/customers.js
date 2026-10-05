"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerRouter = void 0;
const express_1 = require("express");
const connection_1 = require("../database/connection");
exports.customerRouter = (0, express_1.Router)();
// GET all customers
exports.customerRouter.get('/', (req, res) => {
    try {
        const customers = connection_1.db.prepare('SELECT * FROM customers ORDER BY id DESC').all();
        res.json(customers);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET single customer
exports.customerRouter.get('/:id', (req, res) => {
    try {
        const customer = connection_1.db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// CREATE customer
exports.customerRouter.post('/', (req, res) => {
    try {
        const { name, phone, address, lat, lng } = req.body;
        if (!name || !phone || !address || lat === undefined || lng === undefined) {
            return res.status(400).json({ error: 'Missing required customer fields' });
        }
        const result = connection_1.db.prepare(`
      INSERT INTO customers (name, phone, address, lat, lng)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, phone, address, Number(lat), Number(lng));
        const newCustomer = connection_1.db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(newCustomer);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// UPDATE customer
exports.customerRouter.put('/:id', (req, res) => {
    try {
        const { name, phone, address, lat, lng } = req.body;
        const result = connection_1.db.prepare(`
      UPDATE customers
      SET name = ?, phone = ?, address = ?, lat = ?, lng = ?
      WHERE id = ?
    `).run(name, phone, address, Number(lat), Number(lng), req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        const updated = connection_1.db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// DELETE customer
exports.customerRouter.delete('/:id', (req, res) => {
    try {
        connection_1.db.prepare('DELETE FROM orders WHERE customerId = ?').run(req.params.id);
        const result = connection_1.db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json({ success: true, message: 'Customer deleted' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
