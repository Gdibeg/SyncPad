🚀** SyncPad — Real-Time Collaboration Notes App**
SyncPad is a full-stack web application that allows multiple users to create, edit, and collaborate on notes in real time — similar to Google Docs but simplified.

🌟** Features**
🔐** Authentication**
User registration & login (JWT-based)
Protected routes
Secure password hashing (bcrypt)

📝** Notes Management**
Create, edit, delete notes
Auto-save functionality
Pin/Favorite notes
Search notes by title, content, or tags

🏷️ **Tags & Organization**
Add multiple tags to notes
Filter and search using tags

⚡ **Real-Time Collaboration**
Live editing using Socket.io
Multiple users editing the same note
Live typing indicator
Live cursor tracking

💬 **In-Note Chat**
Chat with collaborators inside each note
Real-time messaging

🕘** Version History**
Track all previous versions of notes
Restore any previous version

🔔** Notifications**
Share notifications
Mark as read / mark all as read

🎨 **UI Features**
Dark mode support 🌙
Toast notifications (react-hot-toast)
Clean and responsive UI

⚙️** Settings**
Update profile name
Change password
Logout functionality

🛠️** Tech Stack**
Frontend
React (Vite)
React Router
Axios
Socket.io-client
react-hot-toast
Backend
Node.js
Express.js
MongoDB Atlas
Mongoose
JWT Authentication
Socket.io

📂** Project Structure**
SyncPad/
 ├── server/        # Backend (Node + Express)
 ├── src/           # Frontend (React)
 ├── public/
 ├── package.json
 
⚙️ **Installation & Setup**
1. **Clone the repo**
git clone https://github.com/your-username/SyncPad.git
cd SyncPad

2. **Install frontend dependencies**
npm install

3. **Install backend dependencies**
cd server
npm install

4. **Setup environment variables**
Create .env inside server/:
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key

5. **Run backend**
cd server
npm run dev

6. **Run frontend**
cd ..
npm run dev

🚀** Future Improvements**
1.  Folder / workspace system
2.  Profile picture upload
3.  I-based note summarization
4.  Analytics dashboard
5.  Mobile responsive improvements

🎯** Why this project stands out**
Real-time collaboration using WebSockets
Full authentication system
Advanced features like version history & live cursors
Clean full-stack architecture
Production-ready design# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
