import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Import Routes
import nodesRoutes from './routes/nodes.routes';
import objectivesRoutes from './routes/objectives.routes';
import objectiveGroupsRoutes from './routes/objectiveGroups.routes';
import tasksRoutes from './routes/tasks.routes';
import interactionsRoutes from './routes/interactions.routes';
import projectsRoutes from './routes/projects.routes';
import keyResultsRoutes from './routes/key_results.routes';
import assigneesRoutes from './routes/assignees.routes';
import settingsRoutes from './routes/settings.routes';
import commentsRoutes from './routes/comments.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

// Mount Routes
app.use('/api/nodes', nodesRoutes);
app.use('/api/objectives', objectivesRoutes);
app.use('/api/objective-groups', objectiveGroupsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/key-results', keyResultsRoutes);
app.use('/api/assignees', assigneesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tasks', commentsRoutes);

const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
