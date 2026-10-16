import express from 'express';
import { db } from '../dbconnect';
import { Rider } from '../model/rider';
import { canAccessRider, sendServerError } from '../jwtauth';

export const router = express.Router();

// GET all 13 fixed riders
router.get('/', (req, res) => {
  try {
    // Riders only get their own record; admins get everyone
    const riders = req.user?.role === 'admin'
      ? db.prepare('SELECT * FROM riders ORDER BY id ASC').all()
      : db.prepare('SELECT * FROM riders WHERE id = ?').all(req.user?.riderId);
    res.json(riders);
  } catch (error) {
    sendServerError(res, error);
  }
});

// GET rider details by ID or Job code
router.get('/:idOrCode', (req, res) => {
  try {
    const idOrCode = req.params.idOrCode;
    let riderId = parseInt(idOrCode, 10);
    
    // Check if entered as 'TASK-01' or 'RD-01' or '1'
    if (isNaN(riderId)) {
      const match = idOrCode.match(/\d+/);
      if (match) {
        riderId = parseInt(match[0], 10);
      }
    }

    if (!canAccessRider(req.user, riderId)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ดูข้อมูลไรเดอร์คนอื่น' });
    }

    const rider = db.prepare('SELECT * FROM riders WHERE id = ?').get(riderId);
    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }
    res.json(rider);
  } catch (error) {
    sendServerError(res, error);
  }
});
