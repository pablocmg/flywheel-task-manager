// Load environment variables in serverless environment
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import Routes - using require for serverless compatibility
const nodesRoutes = require('./backend/routes/nodes.routes');
const objectivesRoutes = require('./backend/routes/objectives.routes');
const objectiveGroupsRoutes = require('./backend/routes/objectiveGroups.routes');
const tasksRoutes = require('./backend/routes/tasks.routes');
const interactionsRoutes = require('./backend/routes/interactions.routes');
const projectsRoutes = require('./backend/routes/projects.routes');
const keyResultsRoutes = require('./backend/routes/key_results.routes');
const assigneesRoutes = require('./backend/routes/assignees.routes');

const app = express();

// CORS configuration for Vercel
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Helmet with relaxed CSP for Vercel
app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(express.json());

// Mount Routes - handle both default and direct exports
app.use('/api/nodes', nodesRoutes.default || nodesRoutes);
app.use('/api/objectives', objectivesRoutes.default || objectivesRoutes);
app.use('/api/objective-groups', objectiveGroupsRoutes.default || objectiveGroupsRoutes);
app.use('/api/tasks', tasksRoutes.default || tasksRoutes);
app.use('/api/interactions', interactionsRoutes.default || interactionsRoutes);
app.use('/api/projects', projectsRoutes.default || projectsRoutes);
app.use('/api/key-results', keyResultsRoutes.default || keyResultsRoutes);
app.use('/api/assignees', assigneesRoutes.default || assigneesRoutes);

// Debug endpoint to check env vars
app.get('/api/debug', (req, res) => {
    res.json({
        hasDbUrl: !!process.env.DATABASE_URL,
        dbUrlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'MISSING',
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL,
        corsOrigin: process.env.CORS_ORIGIN || 'not set'
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root handler for Vercel
app.get('/api', (req, res) => {
    res.json({
        message: 'Flywheel Task Manager API',
        version: '1.0.0',
        endpoints: ['/api/health', '/api/debug', '/api/nodes', '/api/objectives', '/api/tasks']
    });
});

// Export for Vercel serverless - Vercel expects the handler to be exported directly
module.exports = app;
