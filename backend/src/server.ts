import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import Routes
import nodesRoutes from './routes/nodes.routes';
import objectivesRoutes from './routes/objectives.routes';
import objectiveGroupsRoutes from './routes/objectiveGroups.routes';
import tasksRoutes from './routes/tasks.routes';
import interactionsRoutes from './routes/interactions.routes';
import projectsRoutes from './routes/projects.routes';
import keyResultsRoutes from './routes/key_results.routes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // TODO: Restrict in production
        methods: ["GET", "POST"]
    }
});

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

const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
