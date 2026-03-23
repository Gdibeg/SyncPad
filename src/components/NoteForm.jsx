import React, { useEffect, useRef, useState } from "react";
import socket from "../socket";
import API from "../api/axios";
import toast from "react-hot-toast";

function NoteForm({
  title,
  content,
  tags,
  setTitle,
  setContent,
  setTags,
  editingId,
  handleSubmit,
  handleCancelEdit,
  user,
  darkMode = false,
}) {
  const [collaborators, setCollaborators] = useState(0);
  const [isSomeoneTyping, setIsSomeoneTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");

  const [liveCursors, setLiveCursors] = useState({});

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const editorWrapperRef = useRef(null);

  useEffect(() => {
    if (!editingId || !user?._id) {
      setCollaborators(0);
      setIsSomeoneTyping(false);
      setShowHistory(false);
      setVersions([]);
      setMessages([]);
      setChatText("");
      setLiveCursors({});
      return;
    }

    setCollaborators(0);
    setIsSomeoneTyping(false);
    setShowHistory(false);
    setVersions([]);
    setMessages([]);
    setChatText("");
    setLiveCursors({});

    socket.emit("join-note", {
      noteId: editingId,
      userId: user._id,
      userName: user.name,
    });

    const fetchMessages = async () => {
      try {
        const res = await API.get(`/chat/${editingId}`);
        setMessages(res.data);
      } catch (error) {
        console.error("Fetch chat messages error:", error);
      }
    };

    fetchMessages();

    const handleReceiveChanges = (newContent) => {
      setContent(newContent);
    };

    const handleReceiveTitle = (newTitle) => {
      setTitle(newTitle);
    };

    const handleCollaboratorsUpdate = ({ count }) => {
      setCollaborators(count);
    };

    const handleUserTyping = () => {
      setIsSomeoneTyping(true);
    };

    const handleUserStopTyping = () => {
      setIsSomeoneTyping(false);
    };

    const handleReceiveMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleLiveCursors = (users) => {
      const cursorMap = {};

      users.forEach((cursor) => {
        if (cursor.userId !== user._id) {
          cursorMap[cursor.socketId] = cursor;
        }
      });

      setLiveCursors(cursorMap);
    };

    const handleCursorUpdate = (cursor) => {
      if (cursor.userId === user._id) return;

      setLiveCursors((prev) => ({
        ...prev,
        [cursor.socketId]: cursor,
      }));
    };

    const handleRemoveCursor = ({ socketId }) => {
      setLiveCursors((prev) => {
        const updated = { ...prev };
        delete updated[socketId];
        return updated;
      });
    };

    socket.on("receive-changes", handleReceiveChanges);
    socket.on("receive-title-changes", handleReceiveTitle);
    socket.on("collaborators-update", handleCollaboratorsUpdate);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);
    socket.on("receive-message", handleReceiveMessage);
    socket.on("live-cursors", handleLiveCursors);
    socket.on("cursor-update", handleCursorUpdate);
    socket.on("remove-cursor", handleRemoveCursor);

    return () => {
      socket.off("receive-changes", handleReceiveChanges);
      socket.off("receive-title-changes", handleReceiveTitle);
      socket.off("collaborators-update", handleCollaboratorsUpdate);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stop-typing", handleUserStopTyping);
      socket.off("receive-message", handleReceiveMessage);
      socket.off("live-cursors", handleLiveCursors);
      socket.off("cursor-update", handleCursorUpdate);
      socket.off("remove-cursor", handleRemoveCursor);

      clearTimeout(typingTimeoutRef.current);
      socket.emit("stop-typing", { noteId: editingId });
    };
  }, [editingId, user?._id, user?.name, setContent, setTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMouseMove = (e) => {
    if (!editingId || !editorWrapperRef.current) return;

    const rect = editorWrapperRef.current.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    socket.emit("cursor-move", {
      noteId: editingId,
      x,
      y,
    });
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (editingId) {
      socket.emit("send-changes", {
        noteId: editingId,
        content: newContent,
      });

      socket.emit("typing", {
        noteId: editingId,
        userName: user?.name,
      });

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop-typing", { noteId: editingId });
      }, 1000);
    }
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    if (editingId) {
      socket.emit("send-title-changes", {
        noteId: editingId,
        title: newTitle,
      });
    }
  };

  const handleTagsChange = (e) => {
    setTags(e.target.value);
  };

  const fetchVersions = async () => {
    if (!editingId) return;

    try {
      setLoadingHistory(true);
      const res = await API.get(`/notes/${editingId}/versions`);
      setVersions(res.data);
    } catch (error) {
      console.error("Fetch versions error:", error);
      toast.error("Failed to fetch version history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleToggleHistory = async () => {
    if (!showHistory && editingId) {
      await fetchVersions();
    }
    setShowHistory((prev) => !prev);
  };

  const handleRestoreVersion = async (versionId) => {
    try {
      const res = await API.put(`/notes/${editingId}/restore/${versionId}`);

      setTitle(res.data.title);
      setContent(res.data.content);
      setTags((res.data.tags || []).join(", "));

      if (editingId) {
        socket.emit("send-title-changes", {
          noteId: editingId,
          title: res.data.title,
        });

        socket.emit("send-changes", {
          noteId: editingId,
          content: res.data.content,
        });
      }

      toast.success("Version restored successfully");
      fetchVersions();
    } catch (error) {
      console.error("Restore version error:", error);
      toast.error(error.response?.data?.message || "Failed to restore version");
    }
  };

  const handleSendMessage = () => {
    if (!chatText.trim() || !editingId || !user?._id) return;

    socket.emit("send-message", {
      noteId: editingId,
      userId: user._id,
      text: chatText.trim(),
    });

    setChatText("");
  };

  const handleChatKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCancel = () => {
    clearTimeout(typingTimeoutRef.current);

    if (editingId) {
      socket.emit("stop-typing", { noteId: editingId });
    }

    setCollaborators(0);
    setIsSomeoneTyping(false);
    setShowHistory(false);
    setVersions([]);
    setMessages([]);
    setChatText("");
    setLiveCursors({});
    setTags("");

    handleCancelEdit();
  };

  const themedStyles = {
    form: {
      ...styles.form,
      background: darkMode ? "#1e293b" : "#fff",
      border: darkMode ? "1px solid #334155" : "1px solid #ddd",
      color: darkMode ? "#f8fafc" : "#111827",
    },
    infoRow: {
      ...styles.infoRow,
      color: darkMode ? "#cbd5e1" : "#555",
    },
    input: {
      ...styles.input,
      background: darkMode ? "#0f172a" : "#fff",
      color: darkMode ? "#fff" : "#111",
      border: darkMode ? "1px solid #475569" : "1px solid #ccc",
    },
    textarea: {
      ...styles.textarea,
      background: darkMode ? "#0f172a" : "#fff",
      color: darkMode ? "#fff" : "#111",
      border: darkMode ? "1px solid #475569" : "1px solid #ccc",
    },
    historyBox: {
      ...styles.historyBox,
      background: darkMode ? "#0f172a" : "#fafafa",
      border: darkMode ? "1px solid #334155" : "1px solid #ddd",
      color: darkMode ? "#f8fafc" : "#111827",
    },
    versionItem: {
      ...styles.versionItem,
      background: darkMode ? "#1e293b" : "#fff",
      border: darkMode ? "1px solid #475569" : "1px solid #ddd",
      color: darkMode ? "#f8fafc" : "#111827",
    },
    chatBox: {
      ...styles.chatBox,
      background: darkMode ? "#1e293b" : "#fff",
      border: darkMode ? "1px solid #334155" : "1px solid #ddd",
      color: darkMode ? "#f8fafc" : "#111827",
    },
    messagesContainer: {
      ...styles.messagesContainer,
      background: darkMode ? "#0f172a" : "#fafafa",
      border: darkMode ? "1px solid #334155" : "1px solid #e5e7eb",
    },
    noMessages: {
      ...styles.noMessages,
      color: darkMode ? "#cbd5e1" : "#666",
    },
    chatInput: {
      ...styles.chatInput,
      background: darkMode ? "#0f172a" : "#fff",
      color: darkMode ? "#fff" : "#111",
      border: darkMode ? "1px solid #475569" : "1px solid #ccc",
    },
    messageTime: {
      ...styles.messageTime,
      color: darkMode ? "#cbd5e1" : "#666",
    },
  };

  return (
    <div
      style={{
        ...styles.wrapper,
        gridTemplateColumns: editingId ? "2fr 1fr" : "1fr",
      }}
    >
      <form onSubmit={handleSubmit} style={themedStyles.form}>
        <h2>{editingId ? "Edit Note" : "Create Note"}</h2>

        {editingId && (
          <div style={themedStyles.infoRow}>
            <span>👥 Collaborators: {collaborators}</span>
            {isSomeoneTyping && <span>✍️ Someone is typing...</span>}
          </div>
        )}

        <div
          ref={editorWrapperRef}
          style={styles.editorWrapper}
          onMouseMove={handleMouseMove}
        >
          <input
            type="text"
            placeholder="Enter note title"
            value={title}
            onChange={handleTitleChange}
            style={themedStyles.input}
            required
          />

          <input
            type="text"
            placeholder="Enter tags separated by commas (example: work, urgent, project)"
            value={tags}
            onChange={handleTagsChange}
            style={themedStyles.input}
          />

          <textarea
            placeholder="Write your note..."
            value={content}
            onChange={handleContentChange}
            rows="8"
            style={themedStyles.textarea}
            required
          />

          {Object.values(liveCursors).map((cursor) => (
            <div
              key={cursor.socketId}
              style={{
                ...styles.cursorContainer,
                left: `${cursor.x}px`,
                top: `${cursor.y}px`,
              }}
            >
              <div
                style={{
                  ...styles.cursorPointer,
                  backgroundColor: cursor.color,
                }}
              />
              <div
                style={{
                  ...styles.cursorLabel,
                  backgroundColor: cursor.color,
                }}
              >
                {cursor.userName}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.buttonRow}>
          <button type="submit" style={styles.button}>
            {editingId ? "Update Note" : "Add Note"}
          </button>

          {editingId && (
            <>
              <button
                type="button"
                onClick={handleCancel}
                style={styles.cancelButton}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleToggleHistory}
                style={styles.historyButton}
              >
                {showHistory ? "Hide History" : "View History"}
              </button>
            </>
          )}
        </div>

        {showHistory && (
          <div style={themedStyles.historyBox}>
            <h3>Version History</h3>

            {loadingHistory ? (
              <p>Loading history...</p>
            ) : versions.length === 0 ? (
              <p>No versions found.</p>
            ) : (
              versions.map((version) => (
                <div key={version._id} style={themedStyles.versionItem}>
                  <p>
                    <strong>Title:</strong> {version.title}
                  </p>
                  <p>
                    <strong>Tags:</strong>{" "}
                    {version.tags?.length ? version.tags.join(", ") : "No tags"}
                  </p>
                  <p>
                    <strong>Content:</strong> {version.content}
                  </p>
                  <p>
                    <strong>Saved At:</strong>{" "}
                    {new Date(version.editedAt).toLocaleString()}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRestoreVersion(version._id)}
                    style={styles.restoreButton}
                  >
                    Restore
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </form>

      {editingId && (
        <div style={themedStyles.chatBox}>
          <h3>💬 Note Chat</h3>

          <div style={themedStyles.messagesContainer}>
            {messages.length === 0 ? (
              <p style={themedStyles.noMessages}>No messages yet</p>
            ) : (
              messages.map((msg) => {
                const senderId =
                  typeof msg.sender === "object" ? msg.sender?._id : msg.sender;

                const isOwn = senderId === user?._id;

                return (
                  <div
                    key={msg._id}
                    style={{
                      ...styles.messageItem,
                      alignSelf: isOwn ? "flex-end" : "flex-start",
                      backgroundColor: isOwn
                        ? darkMode
                          ? "#1d4ed8"
                          : "#dbeafe"
                        : darkMode
                          ? "#334155"
                          : "#f3f4f6",
                      color: darkMode ? "#fff" : "#111",
                    }}
                  >
                    <div style={styles.messageHeader}>
                      <strong>{msg.senderName}</strong>
                    </div>

                    <div>{msg.text}</div>

                    <small style={themedStyles.messageTime}>
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </small>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          <div style={styles.chatInputRow}>
            <input
              type="text"
              placeholder="Type a message..."
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={handleChatKeyDown}
              style={themedStyles.chatInput}
            />

            <button
              type="button"
              onClick={handleSendMessage}
              style={styles.sendButton}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    display: "grid",
    gap: "20px",
    alignItems: "start",
  },
  form: {
    padding: "20px",
    borderRadius: "10px",
  },
  editorWrapper: {
    position: "relative",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "12px",
    fontSize: "14px",
    flexWrap: "wrap",
    gap: "8px",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "12px",
    borderRadius: "8px",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    resize: "vertical",
    marginBottom: "12px",
    boxSizing: "border-box",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  button: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
  },
  cancelButton: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#6b7280",
    color: "#fff",
    cursor: "pointer",
  },
  historyButton: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#7c3aed",
    color: "#fff",
    cursor: "pointer",
  },
  historyBox: {
    marginTop: "20px",
    padding: "15px",
    borderRadius: "8px",
  },
  versionItem: {
    borderRadius: "8px",
    padding: "10px",
    marginBottom: "10px",
    wordBreak: "break-word",
  },
  restoreButton: {
    padding: "8px 12px",
    border: "none",
    borderRadius: "6px",
    background: "#16a34a",
    color: "#fff",
    cursor: "pointer",
  },
  cursorContainer: {
    position: "absolute",
    pointerEvents: "none",
    zIndex: 10,
  },
  cursorPointer: {
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    border: "2px solid white",
    boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
  },
  cursorLabel: {
    marginTop: "4px",
    padding: "2px 6px",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "12px",
    whiteSpace: "nowrap",
    display: "inline-block",
  },
  chatBox: {
    padding: "20px",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    minHeight: "500px",
  },
  messagesContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    overflowY: "auto",
    borderRadius: "8px",
    padding: "10px",
    marginBottom: "12px",
    maxHeight: "400px",
  },
  noMessages: {
    textAlign: "center",
  },
  messageItem: {
    maxWidth: "80%",
    padding: "10px",
    borderRadius: "10px",
    wordBreak: "break-word",
  },
  messageHeader: {
    marginBottom: "4px",
  },
  messageTime: {
    display: "block",
    marginTop: "6px",
  },
  chatInputRow: {
    display: "flex",
    gap: "10px",
  },
  chatInput: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
  },
  sendButton: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#059669",
    color: "#fff",
    cursor: "pointer",
  },
};

export default NoteForm;