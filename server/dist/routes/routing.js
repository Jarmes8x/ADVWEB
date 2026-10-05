"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routingRouter = void 0;
const express_1 = require("express");
const connection_1 = require("../database/connection");
const routeOptimizer_1 = require("../services/routeOptimizer");
exports.routingRouter = (0, express_1.Router)();
const optimizer = new routeOptimizer_1.RouteOptimizerService();
// State caching the latest plan
let latestPlan = null;
// POST /api/routes/optimize - Run or re-calculate route optimization
exports.routingRouter.post('/optimize', (req, res) => {
    try {
        const seed = Number(req.body.seed) || 0;
        // Fetch all current orders with customer coordinates
        const orders = connection_1.db.prepare(`
      SELECT 
        o.id,
        o.orderNumber,
        o.customerId,
        o.boxCount,
        o.orderTime,
        o.status,
        c.name as customerName,
        c.phone as customerPhone,
        c.address as customerAddress,
        c.lat,
        c.lng
      FROM orders o
      JOIN customers c ON o.customerId = c.id
      ORDER BY o.id ASC
    `).all();
        const riders = connection_1.db.prepare('SELECT * FROM riders ORDER BY id ASC').all();
        const plan = optimizer.optimize(orders, riders, connection_1.SHOP_LOCATION, seed);
        latestPlan = plan;
        // Persist assignments back to orders table
        const updateOrder = connection_1.db.prepare(`
      UPDATE orders
      SET assignedRiderId = ?, deliverySequence = ?, status = 'assigned'
      WHERE id = ?
    `);
        const persistAssignments = connection_1.db.transaction(() => {
            for (const route of plan.routes) {
                for (const ord of route.orders) {
                    updateOrder.run(route.riderId, ord.deliverySequence, ord.id);
                }
            }
        });
        persistAssignments();
        res.json(plan);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/routes/current - Get current optimized plan
exports.routingRouter.get('/current', (req, res) => {
    try {
        if (!latestPlan) {
            // Generate initial plan automatically if not generated yet
            const orders = connection_1.db.prepare(`
        SELECT 
          o.id,
          o.orderNumber,
          o.customerId,
          o.boxCount,
          o.orderTime,
          o.status,
          c.name as customerName,
          c.phone as customerPhone,
          c.address as customerAddress,
          c.lat,
          c.lng
        FROM orders o
        JOIN customers c ON o.customerId = c.id
        ORDER BY o.id ASC
      `).all();
            const riders = connection_1.db.prepare('SELECT * FROM riders ORDER BY id ASC').all();
            latestPlan = optimizer.optimize(orders, riders, connection_1.SHOP_LOCATION, 0);
        }
        res.json(latestPlan);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/routes/rider/:jobCodeOrId - Rider view specific route by ID or job code
exports.routingRouter.get('/rider/:jobCodeOrId', (req, res) => {
    try {
        const param = req.params.jobCodeOrId.trim();
        let riderId = parseInt(param, 10);
        if (isNaN(riderId)) {
            const match = param.match(/\d+/);
            if (match) {
                riderId = parseInt(match[0], 10);
            }
        }
        if (!latestPlan) {
            // Initialize if needed
            const orders = connection_1.db.prepare(`
        SELECT 
          o.id,
          o.orderNumber,
          o.customerId,
          o.boxCount,
          o.orderTime,
          o.status,
          c.name as customerName,
          c.phone as customerPhone,
          c.address as customerAddress,
          c.lat,
          c.lng
        FROM orders o
        JOIN customers c ON o.customerId = c.id
        ORDER BY o.id ASC
      `).all();
            const riders = connection_1.db.prepare('SELECT * FROM riders ORDER BY id ASC').all();
            latestPlan = optimizer.optimize(orders, riders, connection_1.SHOP_LOCATION, 0);
        }
        const route = latestPlan.routes.find((r) => r.riderId === riderId);
        if (!route) {
            return res.status(404).json({ error: `ไม่พบใบงานสำหรับไรเดอร์หมายเลข ${param}` });
        }
        res.json({
            shopLocation: latestPlan.shopLocation,
            route
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
