import * as admin from 'firebase-admin';
import { getFirestore } from './firebase';
import { MessageResponse } from '../types';

export class MessageService {
  private get db(): FirebaseFirestore.Firestore {
    return getFirestore();
  }

  
   // Helper to format Firestore document data into MessageResponse
  
  private formatMessage(id: string, data: FirebaseFirestore.DocumentData): MessageResponse {
    let createdAtStr: string;
    if (data.createdAt && typeof data.createdAt.toDate === 'function') {
      createdAtStr = data.createdAt.toDate().toISOString();
    } else if (data.createdAt instanceof Date) {
      createdAtStr = data.createdAt.toISOString();
    } else if (typeof data.createdAt === 'string') {
      createdAtStr = data.createdAt;
    } else {
      createdAtStr = new Date().toISOString();
    }

    const readReceipts: Record<string, string> = {};
    if (data.readReceipts && typeof data.readReceipts === 'object') {
      for (const [uid, timestamp] of Object.entries(data.readReceipts)) {
        if (timestamp && typeof (timestamp as any).toDate === 'function') {
          readReceipts[uid] = (timestamp as any).toDate().toISOString();
        } else if (typeof timestamp === 'string') {
          readReceipts[uid] = timestamp;
        } else {
          readReceipts[uid] = new Date().toISOString();
        }
      }
    }

    return {
      id,
      chatId: data.chatId,
      senderId: data.senderId,
      text: data.text,
      createdAt: createdAtStr,
      readReceipts
    };
  }

  
   // Sends a message in Firestore under chats/{chatId}/messages/{messageId}
  
  async sendMessage(chatId: string, senderId: string, text: string): Promise<MessageResponse> {
    const messagesRef = this.db.collection('chats').doc(chatId).collection('messages');
    const newDocRef = messagesRef.doc();
    const nowIso = new Date().toISOString();

    const messageData = {
      chatId,
      senderId,
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      readReceipts: {
        [senderId]: nowIso
      }
    };

    await newDocRef.set(messageData);

    // Also update last message info on the chat document in Firestore
    await this.db.collection('chats').doc(chatId).set(
      {
        lastMessage: {
          id: newDocRef.id,
          senderId,
          text,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    return {
      id: newDocRef.id,
      chatId,
      senderId,
      text,
      createdAt: nowIso,
      readReceipts: {
        [senderId]: nowIso
      }
    };
  }

  
   // Retrieves messages for a chat ordered by timestamp with limit.
  
  async getMessages(chatId: string, limitCount: number = 50): Promise<MessageResponse[]> {
    const messagesRef = this.db.collection('chats').doc(chatId).collection('messages');

    // Fetch the most recent messages up to the limit
    const snapshot = await messagesRef
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get();

    const messages: MessageResponse[] = [];
    snapshot.forEach((doc) => {
      messages.push(this.formatMessage(doc.id, doc.data()));
    });

    // Return messages ordered chronologically (oldest to newest among the latest batch)
    messages.reverse();
    return messages;
  }

  
   // Marks a specific message as read by the user in Firestore.
  
  async markMessageRead(chatId: string, messageId: string, userId: string): Promise<void> {
    const messageRef = this.db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId);

    const doc = await messageRef.get();
    if (!doc.exists) {
      const err = new Error(`Message with ID '${messageId}' not found in chat '${chatId}'`);
      (err as any).statusCode = 404;
      throw err;
    }

    const nowIso = new Date().toISOString();
    await messageRef.update({
      [`readReceipts.${userId}`]: nowIso
    });
  }

  
   // Updates last seen message for a user in Firestore.
  
  async updateLastSeen(chatId: string, userId: string, messageId: string): Promise<void> {
    const nowIso = new Date().toISOString();

    // 1. Update in subcollection chats/{chatId}/lastSeen/{userId}
    const lastSeenRef = this.db
      .collection('chats')
      .doc(chatId)
      .collection('lastSeen')
      .doc(userId);

    await lastSeenRef.set(
      {
        userId,
        messageId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAtIso: nowIso
      },
      { merge: true }
    );

    // 2. Also record in parent chat document for quick lookup
    await this.db
      .collection('chats')
      .doc(chatId)
      .set(
        {
          lastSeen: {
            [userId]: {
              messageId,
              updatedAt: nowIso
            }
          }
        },
        { merge: true }
      );
  }
}

export const messageService = new MessageService();
