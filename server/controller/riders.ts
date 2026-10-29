import express from 'express';
import { query } from '../dbconnect';
import { Rider } from '../model/rider';
import { canAccessRider, sendServerError } from '../jwtauth';

export const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = req.user?.role === 'admin'
      ? await query('SELECT * FROM riders ORDER BY id ASC')
      : await query('SELECT * FROM riders WHERE id = $1', [req.user?.riderId]);
    res.json(rows);
  } catch (error) {
    sendServerError(res, error);
  }
});

router.get('/:idOrCode', async (req, res) => {
  try {
    const idOrCode = req.params.idOrCode;
    let riderId: number;

    if (/^\d+$/.test(idOrCode)) {
      riderId = parseInt(idOrCode, 10);
    } else {
      const hasLetters = /[a-zA-Z]/.test(idOrCode);
      const match = idOrCode.match(/\d+/);
      riderId = hasLetters && match ? parseInt(match[0], 10) : -1;
    }

    if (!canAccessRider(req.user, riderId)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ดูข้อมูลไรเดอร์คนอื่น' });
    }

    const { rows } = await query('SELECT * FROM riders WHERE id = $1', [riderId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rider not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    sendServerError(res, error);
  }
});
