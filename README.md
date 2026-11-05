# Chat Backend (Node.js + TypeScript + PostgreSQL + Firebase Firestore)

A scalable chat backend built with:
- **Node.js + TypeScript** (strict typing enabled)
- **PostgreSQL** for users, chats, and memberships
- **Firebase Firestore** for real-time messages, read receipts, and last seen tracking

---

## Architecture Overview

| Data | Storage | Description |
|---|---|---|
| **Users & Chats** | Relational DB (PostgreSQL) | Stores user records, 1:1 chat relationships, and participant memberships (`chat_members`). |
| **Messages & Receipts** | Firebase Firestore | Stores messages (`chats/{chatId}/messages/{messageId}`), read receipts per user, and last seen tracking (`chats/{chatId}/lastSeen/{userId}`). |

---

## Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL (v14+ recommended) running locally or remotely
- Firebase project with Firestore enabled (or Firestore emulator)

---

## Setup & Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Edit `.env` (pre-created from `.env.example`):
   ```env
   PORT=3000
   NODE_ENV=development

   # PostgreSQL Database Connection
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=chat_db

   # Firebase Service Account
   FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./serviceAccountKey.json
   ```

3. **Initialize Database Tables:**
   The tables are created automatically on server boot, or you can run:
   ```bash
   npm run db:init
   ```

4. **Run the Server:**
   - **Development mode** (with hot reload):
     ```bash
     npm run dev
     ```
   - **Production build & start**:
     ```bash
     npm run build
     npm start
     ```

---

## API Documentation

### 1. Create or Get Chat
Finds an existing 1:1 chat between two users, or creates a new one in PostgreSQL.

- **Endpoint:** `POST /chat/create`
- **Body:**
  ```json
  {
    "userAId": "user_123",
    "userBId": "user_456"
  }
  ```
- **Response:** `200 OK` (existing) or `201 Created` (new)
  ```json
  {
    "chatId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
  ```

---

### 2. Send Message
Stores message in Firestore under `chats/:chatId/messages` and updates chat activity.

- **Endpoint:** `POST /chat/:chatId/message/send`
- **Body:**
  ```json
  {
    "senderId": "user_123",
    "text": "Hello, how are you?"
  }
  ```
- **Response:** `201 Created`
  ```json
  {
    "id": "firestore_msg_id",
    "chatId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "senderId": "user_123",
    "text": "Hello, how are you?",
    "createdAt": "2026-11-05T13:45:00.000Z",
    "readReceipts": {
      "user_123": "2026-11-05T13:45:00.000Z"
    }
  }
  ```

---

### 3. Get Messages
Retrieves messages for a chat ordered by timestamp with configurable limit.

- **Endpoint:** `GET /chat/:chatId/messages?limit=50`
- **Query Params:** `limit` (default: 50, max: 100)
- **Response:** `200 OK`
  ```json
  [
    {
      "id": "firestore_msg_id",
      "chatId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "senderId": "user_123",
      "text": "Hello, how are you?",
      "createdAt": "2026-11-05T13:45:00.000Z",
      "readReceipts": {
        "user_123": "2026-11-05T13:45:00.000Z"
      }
    }
  ]
  ```

---

### 4. Mark Message Read
Updates the read receipt in Firestore for a given user.

- **Endpoint:** `POST /chat/:chatId/message/:messageId/read`
- **Body:**
  ```json
  {
    "userId": "user_456"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "messageId": "firestore_msg_id",
    "userId": "user_456",
    "status": "read"
  }
  ```

---

### 5. Update Last Seen Message
Tracks the latest message ID seen by a user in the chat in Firestore.

- **Endpoint:** `POST /chat/:chatId/lastseen`
- **Body:**
  ```json
  {
    "userId": "user_456",
    "messageId": "firestore_msg_id"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "chatId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "user_456",
    "messageId": "firestore_msg_id",
    "status": "last_seen_updated"
  }
  ```

---

### 6. List User Chats
Lists all chats a user belongs to along with the list of member IDs from PostgreSQL.

- **Endpoint:** `GET /user/:userId/chats`
- **Response:** `200 OK`
  ```json
  [
    {
      "chatId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "memberIds": ["user_123", "user_456"],
      "createdAt": "2026-11-05T13:40:00.000Z",
      "updatedAt": "2026-11-05T13:45:00.000Z"
    }
  ]
  ```