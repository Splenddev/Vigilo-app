import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import cookieParser from 'cookie-parser';
import groupRoutes from './routes/group.routes.js';

const app = express();

// Middlewares
app.use(
  cors({
    origin: ['http://localhost:5173', 'https://vigilo-app.onrender.com'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);

// Default
app.get('/', (req, res) => res.send('Vigilo API running ✅'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message });
});

export default app;
