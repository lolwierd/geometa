import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import routes
import galleryRouter from './routes/gallery.js';
import collectRouter from './routes/collect.js';
import memorizerRouter from './routes/memorizer.js';
import statsRouter from './routes/stats.js';
import metaRouter from './routes/meta.js';
import imgRouter from './routes/img.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// API Routes
app.use('/api/gallery', galleryRouter);
app.use('/api/collect', collectRouter);
app.use('/api/memorizer', memorizerRouter);
app.use('/api/stats', statsRouter);
app.use('/api/meta', metaRouter);
app.use('/api/img', imgRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 GeoMeta API server running on port ${PORT}`);
});