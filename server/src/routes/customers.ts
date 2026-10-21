import { Router } from 'express';
import { sendServerError } from '../middleware/auth';
import { query, transaction } from '../database/connection';
import { Customer } from '../models/types';
import { isZone, inferZone } from '../models/zones';

export const customerRouter = Router();

// GET all customers
customerRouter.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM customers ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    sendServerError(res, error);
  }
});

// GET single customer
customerRouter.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const { rows } = await query('SELECT * FROM customers WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    sendServerError(res, error);
  }
});

// CREATE customer
customerRouter.post('/', async (req, res) => {
  try {
    const { name, phone, address, lat, lng, zone }: Customer = req.body;
    if (!name || !phone || !address || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return res.status(400).json({ error: 'Missing or invalid customer fields' });
    }
    if (zone !== undefined && !isZone(zone)) {
      return res.status(400).json({ error: 'zone must be one of: ขามเรียง, ท่าขอนยาง, หน้าป้าย' });
    }
    const finalZone = zone ?? inferZone(Number(lat), Number(lng), address);
    const { rows } = await query(
      `INSERT INTO customers (name, phone, address, lat, lng, zone)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, phone, address, Number(lat), Number(lng), finalZone]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    sendServerError(res, error);
  }
});

// UPDATE customer (full replacement — every required field must be sent)
customerRouter.put('/:id', async (req, res) => {
  try {
    const { name, phone, address, lat, lng, zone }: Customer = req.body;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    if (!name || !phone || !address || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return res.status(400).json({ error: 'Missing or invalid customer fields' });
    }
    if (zone !== undefined && !isZone(zone)) {
      return res.status(400).json({ error: 'zone must be one of: ขามเรียง, ท่าขอนยาง, หน้าป้าย' });
    }
    const finalZone = zone ?? inferZone(Number(lat), Number(lng), address);
    const { rows } = await query(
      `UPDATE customers
       SET name = $1, phone = $2, address = $3, lat = $4, lng = $5, zone = $6
       WHERE id = $7 RETURNING *`,
      [name, phone, address, Number(lat), Number(lng), finalZone, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    sendServerError(res, error);
  }
});

// DELETE customer (cascades their orders atomically)
customerRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const deleted = await transaction(async (client) => {
      await client.query('DELETE FROM orders WHERE "customerId" = $1', [id]);
      const { rowCount } = await client.query('DELETE FROM customers WHERE id = $1', [id]);
      return rowCount;
    });
    if (!deleted) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    sendServerError(res, error);
  }
});
