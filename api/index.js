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

app.use(cors());
app.use(helmet());
app.use(express.json());

// Mount Routes
app.use('/api/nodes', nodesRoutes.default || nodesRoutes);
app.use('/api/objectives', objectivesRoutes.default || objectivesRoutes);
app.use('/api/objective-groups', objectiveGroupsRoutes.default || objectiveGroupsRoutes);
app.use('/api/tasks', tasksRoutes.default || tasksRoutes);
app.use('/api/interactions', interactionsRoutes.default || interactionsRoutes);
app.use('/api/projects', projectsRoutes.default || projectsRoutes);
app.use('/api/key-results', keyResultsRoutes.default || keyResultsRoutes);
app.use('/api/assignees', assigneesRoutes.default || assigneesRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export for Vercel serverless
module.exports = app;
