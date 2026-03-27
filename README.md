# 🧠 Tech Stack

### Frontend
- React + Vite
- Tailwind CSS
- Axios
- Socket.io-client
- React Hot Toast
- Lucide Icons

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.io
- JWT Authentication

---

## 🏗️ Project Structure


SyncPad
├── client # React frontend
│ ├── components
│ ├── pages
│ ├── api
│ └── socket.js
│
├── server # Node backend
│ ├── controllers
│ ├── models
│ ├── routes
│ ├── sockets
│ └── utils


---

## ⚡ Real-Time Architecture


User A edits note
↓
Socket.io emits change
↓
Server broadcasts update
↓
User B sees changes instantly


✔ No refresh needed  
✔ Multi-user sync  
✔ Real-time UX  

---

## 🔔 Notification System

- Share notifications
- Note update notifications
- Chat message notifications
- Unread count system
- Mark single / all as read
- Backend + real-time integration

---

## 🛠️ Setup Instructions

### 1️⃣ Clone Repository

```bash
git clone https://github.com/Gdibeg/SyncPad.git
cd SyncPad
2️⃣ Install Dependencies
cd server
npm install

cd ../client
npm install
3️⃣ Environment Variables

Create .env in server/:

PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
4️⃣ Run Application
Backend
cd server
npm run dev
Frontend
cd client
npm run dev
🔐 Authentication Flow
User registers / logs in
JWT token stored in localStorage
Axios interceptor attaches token to requests
Protected routes secured via middleware
⚡ Key Highlights (Interview Ready)
🔥 Real-time collaboration using WebSockets
🔥 Multi-user editing with cursor tracking
🔥 Version control system for notes
🔥 Role-based access (Owner vs Shared)
🔥 Scalable backend architecture
🔥 Clean UI with modern UX patterns
📸 Screens (Optional — Add Later)
Dashboard
Editor
Chat
Notifications
🚀 Future Improvements
Real-time notifications without polling
Rich text editor (like Notion)
File uploads
AI-assisted note suggestions
Mobile app version
