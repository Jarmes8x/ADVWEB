"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riderRouter = void 0;
const express_1 = require("express");
const connection_1 = require("../database/connection");
exports.riderRouter = (0, express_1.Router)();
// GET all 13 fixed riders
exports.riderRouter.get('/', (req, res) => {
    try {
        const riders = connection_1.db.prepare('SELECT * FROM riders ORDER BY id ASC').all();
        res.json(riders);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET rider details by ID or Job code
exports.riderRouter.get('/:idOrCode', (req, res) => {
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
        const rider = connection_1.db.prepare('SELECT * FROM riders WHERE id = ?').get(riderId);
        if (!rider) {
            return res.status(404).json({ error: 'Rider not found' });
        }
        res.json(rider);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
