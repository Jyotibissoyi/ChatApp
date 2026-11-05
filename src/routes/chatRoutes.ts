import { Router } from 'express';
import { chatController } from '../controllers/chatController';

const router = Router();

// 1. Create or Get Chat: POST /chat/create
router.post('/chat/create', (req, res, next) => {
  chatController.createOrGetChat(req, res, next);
});

// 2. Send Message: POST /chat/:chatId/message/send
router.post('/chat/:chatId/message/send', (req, res, next) => {
  chatController.sendMessage(req, res, next);
});

// 3. Get Messages: GET /chat/:chatId/messages?limit=50
router.get('/chat/:chatId/messages', (req, res, next) => {
  chatController.getMessages(req, res, next);
});

// 4. Mark Message Read: POST /chat/:chatId/message/:messageId/read
router.post('/chat/:chatId/message/:messageId/read', (req, res, next) => {
  chatController.markMessageRead(req, res, next);
});

// 5. Update Last Seen Message: POST /chat/:chatId/lastseen
router.post('/chat/:chatId/lastseen', (req, res, next) => {
  chatController.updateLastSeen(req, res, next);
});

// 6. List User Chats: GET /user/:userId/chats
router.get('/user/:userId/chats', (req, res, next) => {
  chatController.listUserChats(req, res, next);
});

export default router;
