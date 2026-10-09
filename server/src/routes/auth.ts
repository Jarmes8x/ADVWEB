import { Router } from 'express';
import { db } from '../database/connection';
import { requireAuth, signToken, verifyPassword, sendServerError, AuthUser, Role } from '../middleware/auth';

export const authRouter = Router();

interface UserRow {
  id: number;
  username: string;
  passwordHash: string;
  role: Role;
  riderId: number | null;
}

// POST /api/auth/login - Exchange username/password for a JWT
authRouter.post('/login', (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim()) as UserRow | undefined;
    // Same message for unknown user and wrong password, so usernames can't be probed
    if (!row || !verifyPassword(password, row.passwordHash)) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user: AuthUser = { userId: row.id, username: row.username, role: row.role, riderId: row.riderId };
    res.json({ token: signToken(user), user });
  } catch (error) {
    sendServerError(res, error);
  }
});

// GET /api/auth/me - Return the user attached to the current token
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
