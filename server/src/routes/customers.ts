import { Router } from 'express';
import { sendServerError } from '../middleware/auth';
import { db } from '../database/connection';
import { Customer } from '../models/types';

export const customerRouter = Router();

// GET all customers
customerRouter.get('/', (req, res) => {
  try {
    const customers = db.prepare('SELECT * FROM customers ORDER BY id DESC').all();
    res.json(customers);
  } catch (error) {
    sendServerError(res, error);
  }
});

// GET single customer
customerRouter.get('/:id', (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    sendServerError(res, error);
  }
});

// CREATE customer
customerRouter.post('/', (req, res) => {
  try {
    const { name, phone, address, lat, lng }: Customer = req.body;
    if (!name || !phone || !address || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return res.status(400).json({ error: 'Missing or invalid customer fields' });
    }
    const result = db.prepare(`
      INSERT INTO customers (name, phone, address, lat, lng)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, phone, address, Number(lat), Number(lng));

    const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newCustomer);
  } catch (error) {
    sendServerError(res, error);
  }
});

// UPDATE customer
customerRouter.put('/:id', (req, res) => {
  try {
    const { name, phone, address, lat, lng }: Customer = req.body;
    if (!name || !phone || !address || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return res.status(400).json({ error: 'Missing or invalid customer fields' });
    }
    const result = db.prepare(`
      UPDATE customers
      SET name = ?, phone = ?, address = ?, lat = ?, lng = ?
      WHERE id = ?
    `).run(name, phone, address, Number(lat), Number(lng), req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    sendServerError(res, error);
  }
});

// DELETE customer
customerRouter.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM orders WHERE customerId = ?').run(req.params.id);
    const result = db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    sendServerError(res, error);
  }
});
