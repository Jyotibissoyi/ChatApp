
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './db';
import { UserChatSummary } from '../types';

export class ChatRepository {
  private get db() {
    return getDatabase();
  }

  // Create a user if they don't already exist
  async ensureUserExists(userId: string, name?: string): Promise<void> {
    await this.db.query(
      `INSERT INTO users (id, name, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING`,
      [userId, name || `User_${userId}`]
    );
  }

  // Find an existing 1:1 chat between two users
  async find1to1Chat(
    userAId: string,
    userBId: string
  ): Promise<string | null> {
    const query = `
      SELECT cm1.chat_id
      FROM chat_members cm1
      JOIN chat_members cm2 ON cm1.chat_id = cm2.chat_id
      WHERE cm1.user_id = $1 AND cm2.user_id = $2
      AND (
        SELECT COUNT(*)
        FROM chat_members cm_count
        WHERE cm_count.chat_id = cm1.chat_id
      ) = 2
      LIMIT 1
    `;

    const rows = await this.db.query<{ chat_id: string }>(
      query,
      [userAId, userBId]
    );

    return rows.length > 0 ? rows[0].chat_id : null;
  }

  // Create a new 1:1 chat and add both users as members
  async create1to1Chat(
    userAId: string,
    userBId: string
  ): Promise<string> {
    await this.ensureUserExists(userAId);
    await this.ensureUserExists(userBId);

    const chatId = uuidv4();

    // Create the chat record
    await this.db.query(
      `INSERT INTO chats (id, created_at, updated_at)
       VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [chatId]
    );

    // Add the first user to the chat
    await this.db.query(
      `INSERT INTO chat_members (chat_id, user_id, joined_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      [chatId, userAId]
    );

    // Add the second user to the chat
    await this.db.query(
      `INSERT INTO chat_members (chat_id, user_id, joined_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      [chatId, userBId]
    );

    return chatId;
  }

  // Check whether a chat exists
  async chatExists(chatId: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      'SELECT id FROM chats WHERE id = $1 LIMIT 1',
      [chatId]
    );

    return rows.length > 0;
  }

  // Check whether a user belongs to a particular chat
  async isUserMemberOfChat(
    chatId: string,
    userId: string
  ): Promise<boolean> {
    const rows = await this.db.query<{ chat_id: string }>(
      `SELECT chat_id
       FROM chat_members
       WHERE chat_id = $1 AND user_id = $2
       LIMIT 1`,
      [chatId, userId]
    );

    return rows.length > 0;
  }

  // Get all member IDs of a chat
  async getChatMembers(chatId: string): Promise<string[]> {
    const rows = await this.db.query<{ user_id: string }>(
      `SELECT user_id
       FROM chat_members
       WHERE chat_id = $1
       ORDER BY joined_at ASC`,
      [chatId]
    );

    return rows.map((row) => row.user_id);
  }

  // Update the last activity timestamp of a chat
  async touchChatUpdatedAt(chatId: string): Promise<void> {
    await this.db.query(
      'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [chatId]
    );
  }

  // Get all chats associated with a user, including their members
  async getUserChats(userId: string): Promise<UserChatSummary[]> {
    const query = `
      SELECT
        c.id AS chat_id,
        c.created_at,
        c.updated_at,
        cm_all.user_id AS member_id
      FROM chats c
      JOIN chat_members cm_user ON c.id = cm_user.chat_id
      JOIN chat_members cm_all ON c.id = cm_all.chat_id
      WHERE cm_user.user_id = $1
      ORDER BY c.updated_at DESC
    `;

    interface Row {
      chat_id: string;
      created_at: Date | string;
      updated_at: Date | string;
      member_id: string;
    }

    const rows = await this.db.query<Row>(query, [userId]);

    const chatMap = new Map<string, UserChatSummary>();

    for (const row of rows) {
      if (!chatMap.has(row.chat_id)) {
        chatMap.set(row.chat_id, {
          chatId: row.chat_id,
          memberIds: [],
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      }

      const chat = chatMap.get(row.chat_id)!;

      if (!chat.memberIds.includes(row.member_id)) {
        chat.memberIds.push(row.member_id);
      }
    }

    return Array.from(chatMap.values());
  }
}

export const chatRepository = new ChatRepository();
