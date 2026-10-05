"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const connection_1 = require("./database/connection");
const customers_1 = require("./routes/customers");
const orders_1 = require("./routes/orders");
const riders_1 = require("./routes/riders");
const routing_1 = require("./routes/routing");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize SQLite database schema and seed
(0, connection_1.initDatabase)();
// API Endpoints
app.use('/api/customers', customers_1.customerRouter);
app.use('/api/orders', orders_1.orderRouter);
app.use('/api/riders', riders_1.riderRouter);
app.use('/api/routes', routing_1.routingRouter);
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.listen(PORT, () => {
    console.log(`🚀 Smart Rider Backend running on http://localhost:${PORT}`);
});
