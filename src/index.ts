import { createApp } from './app';
import { config } from './config/env';
import { initDatabase } from './database/init';
import { getFirestore } from './firebase/firebase';

async function bootstrap(): Promise<void> {
  console.log(`Starting Chat Backend (${config.nodeEnv} mode)...`);

  // 1. Initialize PostgreSQL database tables
  try {
    await initDatabase();
  } catch (err) {
    console.warn('[PostgreSQL Warning] Could not connect or auto-initialize database on startup.');
    console.warn('Please ensure PostgreSQL is running and credentials in .env are correct.');
    console.warn((err as Error).message);
  }

  // 2. Initialize Firebase Firestore
  try {
    getFirestore();
    console.log('[Firebase] Firestore initialized.');
  } catch (err) {
    console.warn('[Firebase Warning] Firebase Firestore initialization error:');
    console.warn((err as Error).message);
  }

  // 3. Start Express server
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`===============================================`);
    console.log(` Chat Backend is running on http://localhost:${config.port}`);
    console.log(` Database: PostgreSQL`);
    console.log(` Endpoints:`);
    console.log(`   POST /chat/create`);
    console.log(`   POST /chat/:chatId/message/send`);
    console.log(`   GET  /chat/:chatId/messages?limit=50`);
    console.log(`   POST /chat/:chatId/message/:messageId/read`);
    console.log(`   POST /chat/:chatId/lastseen`);
    console.log(`   GET  /user/:userId/chats`);
    console.log(`===============================================`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('\nShutting down server gracefully...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
  console.error('Fatal bootstrap error:', error);
  process.exit(1);
});
