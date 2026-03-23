const ChatMessage = require("../models/ChatMessage");
const Note = require("../models/Note");
const User = require("../models/User");
const createNotification = require("../utils/createNotification");

const noteUsers = {};

const cursorColors = [
  "#ff4d4f",
  "#52c41a",
  "#1890ff",
  "#faad14",
  "#722ed1",
  "#13c2c2",
  "#eb2f96",
  "#fa8c16",
];

function getUserColor(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return cursorColors[Math.abs(hash) % cursorColors.length];
}

const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-note", ({ noteId, userId, userName }) => {
      socket.join(noteId);

      socket.noteId = noteId;
      socket.userId = userId;
      socket.userName = userName;

      if (!noteUsers[noteId]) {
        noteUsers[noteId] = {};
      }

      noteUsers[noteId][socket.id] = {
        userId,
        userName,
        color: getUserColor(userId),
      };

      io.to(noteId).emit("collaborators-update", {
        count: Object.keys(noteUsers[noteId]).length,
      });

      io.to(noteId).emit(
        "live-cursors",
        Object.entries(noteUsers[noteId]).map(([socketId, user]) => ({
          socketId,
          userId: user.userId,
          userName: user.userName,
          color: user.color,
          x: 0,
          y: 0,
        })),
      );
    });

    socket.on("send-changes", ({ noteId, content }) => {
      socket.to(noteId).emit("receive-changes", content);
    });

    socket.on("send-title-changes", ({ noteId, title }) => {
      socket.to(noteId).emit("receive-title-changes", title);
    });

    socket.on("typing", ({ noteId, userName }) => {
      socket.to(noteId).emit("user-typing", { userName });
    });

    socket.on("stop-typing", ({ noteId }) => {
      socket.to(noteId).emit("user-stop-typing");
    });

    socket.on("cursor-move", ({ noteId, x, y }) => {
      if (!noteUsers[noteId] || !noteUsers[noteId][socket.id]) return;

      const user = noteUsers[noteId][socket.id];

      socket.to(noteId).emit("cursor-update", {
        socketId: socket.id,
        userId: user.userId,
        userName: user.userName,
        color: user.color,
        x,
        y,
      });
    });

    socket.on("send-message", async ({ noteId, userId, text }) => {
      try {
        if (!text || !text.trim()) return;

        const note = await Note.findById(noteId);
        if (!note) return;

        const isOwner = note.owner.toString() === userId;
        const isSharedUser = (note.sharedWith || []).some(
          (id) => id.toString() === userId,
        );

        if (!isOwner && !isSharedUser) return;

        const user = await User.findById(userId);
        if (!user) return;

        const newMessage = await ChatMessage.create({
          note: noteId,
          sender: userId,
          senderName: user.name,
          text: text.trim(),
        });

        const recipients = [];

        if (note.owner.toString() !== userId) {
          recipients.push(note.owner.toString());
        }

        (note.sharedWith || []).forEach((sharedUserId) => {
          if (sharedUserId.toString() !== userId) {
            recipients.push(sharedUserId.toString());
          }
        });

        for (const recipientId of recipients) {
          await createNotification({
            recipient: recipientId,
            sender: userId,
            senderName: user.name,
            note: noteId,
            type: "chat",
            message: `${user.name} sent a message in "${note.title}"`,
          });
        }

        io.to(noteId).emit("receive-message", {
          _id: newMessage._id,
          note: newMessage.note,
          sender: newMessage.sender,
          senderName: newMessage.senderName,
          text: newMessage.text,
          createdAt: newMessage.createdAt,
        });
      } catch (error) {
        console.error("Send message socket error:", error.message);
      }
    });

    socket.on("disconnect", () => {
      const noteId = socket.noteId;

      if (noteId && noteUsers[noteId]) {
        delete noteUsers[noteId][socket.id];

        io.to(noteId).emit("remove-cursor", { socketId: socket.id });

        io.to(noteId).emit("collaborators-update", {
          count: Object.keys(noteUsers[noteId]).length,
        });

        if (Object.keys(noteUsers[noteId]).length === 0) {
          delete noteUsers[noteId];
        }
      }

      console.log("User disconnected:", socket.id);
    });
  });
};

module.exports = setupSocket;
