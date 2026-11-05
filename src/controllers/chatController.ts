import { Request, Response, NextFunction } from 'express';
import { chatRepository } from '../database/chatRepository';
import { messageService } from '../firebase/messageService';
import {
  CreateChatRequest,
  SendMessageRequest,
  MarkMessageReadRequest,
  UpdateLastSeenRequest
} from '../types';


export class ChatController {
  // Create a new 1:1 chat or return an existing chat ID
  // POST /chat/create
  async createOrGetChat(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userAId, userBId } = req.body as CreateChatRequest;

      if (!userAId || typeof userAId !== 'string' || !userAId.trim()) {
        res.status(400).json({
          error: 'userAId is required and must be a non-empty string'
        });
        return;
      }

      if (!userBId || typeof userBId !== 'string' || !userBId.trim()) {
        res.status(400).json({
          error: 'userBId is required and must be a non-empty string'
        });
        return;
      }

      if (userAId === userBId) {
        res.status(400).json({
          error: 'userAId and userBId must be distinct for a 1:1 chat'
        });
        return;
      }

      // Check if the chat already exists
      const existingChatId = await chatRepository.find1to1Chat(
        userAId,
        userBId
      );

      if (existingChatId) {
        res.status(200).json({ chatId: existingChatId });
        return;
      }

      // Create a new chat if no existing chat is found
      const newChatId = await chatRepository.create1to1Chat(
        userAId,
        userBId
      );

      res.status(201).json({ chatId: newChatId });
    } catch (error) {
      next(error);
    }
  }

  // Send a message and store it in Firestore
  // POST /chat/:chatId/message/send
  async sendMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { chatId } = req.params;
      const { senderId, text } = req.body as SendMessageRequest;

      if (!chatId || typeof chatId !== 'string') {
        res.status(400).json({
          error: 'chatId route parameter is required'
        });
        return;
      }

      if (!senderId || typeof senderId !== 'string' || !senderId.trim()) {
        res.status(400).json({
          error: 'senderId is required and must be a non-empty string'
        });
        return;
      }

      if (!text || typeof text !== 'string' || !text.trim()) {
        res.status(400).json({
          error: 'text is required and must be a non-empty string'
        });
        return;
      }

      // Make sure the chat exists before sending a message
      const chatExists = await chatRepository.chatExists(chatId);

      if (!chatExists) {
        res.status(404).json({
          error: `Chat with ID '${chatId}' not found`
        });
        return;
      }

      // Only chat participants can send messages
      const isMember = await chatRepository.isUserMemberOfChat(
        chatId,
        senderId
      );

      if (!isMember) {
        res.status(403).json({
          error: `User '${senderId}' is not a participant in chat '${chatId}'`
        });
        return;
      }

      const message = await messageService.sendMessage(
        chatId,
        senderId,
        text.trim()
      );

      // Update the chat's last activity in the relational database
      await chatRepository.touchChatUpdatedAt(chatId);

      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  }

  // Fetch messages for a particular chat
  // GET /chat/:chatId/messages?limit=50
  async getMessages(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { chatId } = req.params;
      const limitParam = req.query.limit as string | undefined;

      if (!chatId || typeof chatId !== 'string') {
        res.status(400).json({
          error: 'chatId route parameter is required'
        });
        return;
      }

      // Check whether the chat exists
      const chatExists = await chatRepository.chatExists(chatId);

      if (!chatExists) {
        res.status(404).json({
          error: `Chat with ID '${chatId}' not found`
        });
        return;
      }

      let limit = 50;

      if (limitParam) {
        const parsedLimit = parseInt(limitParam, 10);

        if (isNaN(parsedLimit) || parsedLimit <= 0) {
          res.status(400).json({
            error: 'limit query parameter must be a positive integer'
          });
          return;
        }

        limit = Math.min(parsedLimit, 100);
      }

      const messages = await messageService.getMessages(chatId, limit);

      res.status(200).json(messages);
    } catch (error) {
      next(error);
    }
  }

  // Mark a message as read by a chat participant
  // POST /chat/:chatId/message/:messageId/read
  async markMessageRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { chatId, messageId } = req.params;
      const { userId } = req.body as MarkMessageReadRequest;

      if (!chatId || !messageId) {
        res.status(400).json({
          error: 'chatId and messageId route parameters are required'
        });
        return;
      }

      if (!userId || typeof userId !== 'string' || !userId.trim()) {
        res.status(400).json({
          error: 'userId is required and must be a non-empty string'
        });
        return;
      }

      // Check whether the chat exists
      const chatExists = await chatRepository.chatExists(chatId);

      if (!chatExists) {
        res.status(404).json({
          error: `Chat with ID '${chatId}' not found`
        });
        return;
      }

      // Verify that the user belongs to this chat
      const isMember = await chatRepository.isUserMemberOfChat(
        chatId,
        userId
      );

      if (!isMember) {
        res.status(403).json({
          error: `User '${userId}' is not a participant in chat '${chatId}'`
        });
        return;
      }

      await messageService.markMessageRead(
        chatId,
        messageId,
        userId
      );

      res.status(200).json({
        success: true,
        messageId,
        userId,
        status: 'read'
      });
    } catch (error) {
      next(error);
    }
  }

  // Update the last message seen by a user
  // POST /chat/:chatId/lastseen
  async updateLastSeen(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { chatId } = req.params;
      const { userId, messageId } = req.body as UpdateLastSeenRequest;

      if (!chatId) {
        res.status(400).json({
          error: 'chatId route parameter is required'
        });
        return;
      }

      if (!userId || typeof userId !== 'string' || !userId.trim()) {
        res.status(400).json({
          error: 'userId is required and must be a non-empty string'
        });
        return;
      }

      if (!messageId || typeof messageId !== 'string' || !messageId.trim()) {
        res.status(400).json({
          error: 'messageId is required and must be a non-empty string'
        });
        return;
      }

      // Check whether the chat exists
      const chatExists = await chatRepository.chatExists(chatId);

      if (!chatExists) {
        res.status(404).json({
          error: `Chat with ID '${chatId}' not found`
        });
        return;
      }

      // Verify that the user is a chat participant
      const isMember = await chatRepository.isUserMemberOfChat(
        chatId,
        userId
      );

      if (!isMember) {
        res.status(403).json({
          error: `User '${userId}' is not a participant in chat '${chatId}'`
        });
        return;
      }

      await messageService.updateLastSeen(
        chatId,
        userId,
        messageId
      );

      res.status(200).json({
        success: true,
        chatId,
        userId,
        messageId,
        status: 'last_seen_updated'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all chats associated with a user
  // GET /user/:userId/chats
  async listUserChats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId || typeof userId !== 'string' || !userId.trim()) {
        res.status(400).json({
          error: 'userId route parameter is required'
        });
        return;
      }

      // Make sure the user exists before fetching their chats
      await chatRepository.ensureUserExists(userId);

      const chats = await chatRepository.getUserChats(userId);

      res.status(200).json(chats);
    } catch (error) {
      next(error);
    }
  }
}


export const chatController = new ChatController();
