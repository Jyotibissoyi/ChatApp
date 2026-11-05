export interface User {
  id: string;
  name?: string;
  createdAt: Date;
}

export interface Chat {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMember {
  chatId: string;
  userId: string;
  joinedAt: Date;
}

export interface UserChatSummary {
  chatId: string;
  memberIds: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ReadReceipt {
  userId: string;
  readAt: string;
}

export interface FirestoreMessageDoc {
  id?: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue | Date | string;
  readBy?: Record<string, FirebaseFirestore.Timestamp | string>;
}

export interface MessageResponse {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readReceipts: Record<string, string>;
}

export interface LastSeenRecord {
  userId: string;
  messageId: string;
  updatedAt: string;
}

// Request DTOs
export interface CreateChatRequest {
  userAId: string;
  userBId: string;
}

export interface SendMessageRequest {
  senderId: string;
  text: string;
}

export interface MarkMessageReadRequest {
  userId: string;
}

export interface UpdateLastSeenRequest {
  userId: string;
  messageId: string;
}
