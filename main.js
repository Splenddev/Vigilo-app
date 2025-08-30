import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './src/app.js';

dotenv.config({ path: './.env' });

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

async function startServer() {
  try {
    if (!MONGO_URI) {
      throw new Error('❌ MONGO_URI not defined in .env');
    }

    await mongoose.connect(MONGO_URI, { dbName: 'vigilo' });
    console.log('✅ Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
