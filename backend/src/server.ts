import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import Routes
import nodesRoutes from './routes/nodes.routes';
import objectivesRoutes from './routes/objectives.routes';
import tasksRoutes from './routes/tasks.routes';

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
app.use('/api/tasks', tasksRoutes);

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
