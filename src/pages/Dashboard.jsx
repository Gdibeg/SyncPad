import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import socket from "../socket";
import NoteForm from "../components/NoteForm";
import NoteCard from "../components/NoteCard";
import toast from "react-hot-toast";

function Dashboard() {
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("syncpad-theme") === "dark",
  );

  const currentUserId = localStorage.getItem("userId") || "";

  const user = {
    _id: localStorage.getItem("userId") || "",
    name: localStorage.getItem("userName") || "User",
    email: localStorage.getItem("userEmail") || "",
  };

  const parseTags = (tagsValue) => {
    if (!tagsValue.trim()) return [];

    return [
      ...new Set(
        tagsValue
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      ),
    ];
  };

  const fetchNotes = async () => {
    try {
      const res = await API.get("/notes");
      setNotes(res.data);
    } catch (error) {
      console.error(error.response?.data?.message || "Failed to fetch notes");
      toast.error(error.response?.data?.message || "Failed to fetch notes");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await API.get("/notifications");
      setNotifications(res.data);
    } catch (error) {
      console.error(
        error.response?.data?.message || "Failed to fetch notifications",
      );
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchNotifications();
  }, []);

  useEffect(() => {
    localStorage.setItem("syncpad-theme", darkMode ? "dark" : "light");
    document.body.style.backgroundColor = darkMode ? "#0f172a" : "#f8fafc";
    document.body.style.color = darkMode ? "#f8fafc" : "#111827";
  }, [darkMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleNoteUpdate = (updatedNote) => {
      setNotes((prevNotes) => {
        const exists = prevNotes.some((note) => note._id === updatedNote._id);

        if (exists) {
          return prevNotes.map((note) =>
            note._id === updatedNote._id ? updatedNote : note,
          );
        }

        return [updatedNote, ...prevNotes];
      });

      if (editingId === updatedNote._id) {
        setTitle(updatedNote.title || "");
        setContent(updatedNote.content || "");
        setTags((updatedNote.tags || []).join(", "));
      }
    };

    socket.on("note-updated", handleNoteUpdate);

    return () => {
      socket.off("note-updated", handleNoteUpdate);
    };
  }, [editingId]);

  useEffect(() => {
    if (!editingId) return;
    if (!title.trim() || !content.trim()) return;

    setSaveStatus("Saving...");

    const timer = setTimeout(async () => {
      try {
        const res = await API.put(`/notes/${editingId}`, {
          title,
          content,
          tags: parseTags(tags),
        });

        setSaveStatus("Saved");

        setNotes((prevNotes) =>
          prevNotes.map((note) => (note._id === editingId ? res.data : note)),
        );
      } catch (error) {
        console.error(error.response?.data?.message || "Auto-save failed");
        setSaveStatus("Auto-save failed");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [title, content, tags, editingId]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotes = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    const searchedNotes = !query
      ? notes
      : notes.filter((note) => {
          const noteTitle = note.title?.toLowerCase() || "";
          const noteContent = note.content?.toLowerCase() || "";
          const noteTags = (note.tags || []).join(" ").toLowerCase();

          return (
            noteTitle.includes(query) ||
            noteContent.includes(query) ||
            noteTags.includes(query)
          );
        });

    return [...searchedNotes].sort((a, b) => {
      if (a.isPinned === b.isPinned) return 0;
      return a.isPinned ? -1 : 1;
    });
  }, [notes, searchTerm]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    toast.success("Logged out successfully");

    setTimeout(() => {
      navigate("/login");
    }, 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    try {
      if (editingId) {
        const res = await API.put(`/notes/${editingId}`, {
          title,
          content,
          tags: parseTags(tags),
        });

        setNotes((prevNotes) =>
          prevNotes.map((note) => (note._id === editingId ? res.data : note)),
        );

        setEditingId(null);
        setSaveStatus("");
        toast.success("Note updated successfully");
      } else {
        const res = await API.post("/notes", {
          title,
          content,
          tags: parseTags(tags),
        });
        setNotes((prevNotes) => [res.data, ...prevNotes]);
        toast.success("Note created successfully");
      }

      setTitle("");
      setContent("");
      setTags("");
    } catch (error) {
      console.error(error.response?.data?.message || "Failed to save note");
      toast.error(error.response?.data?.message || "Failed to save note");
    }
  };

  const handleEdit = (note) => {
    setTitle(note.title || "");
    setContent(note.content || "");
    setTags((note.tags || []).join(", "));
    setEditingId(note._id);
    setSaveStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this note?",
    );
    if (!confirmDelete) return;

    try {
      await API.delete(`/notes/${id}`);

      setNotes((prevNotes) => prevNotes.filter((note) => note._id !== id));

      toast.success("Note deleted successfully");
    } catch (error) {
      console.error(error.response?.data?.message || "Failed to delete note");
      toast.error(error.response?.data?.message || "Failed to delete note");
    }
  };

  const handleCancelEdit = () => {
    setTitle("");
    setContent("");
    setTags("");
    setEditingId(null);
    setSaveStatus("");
  };

  const handleMarkAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);

      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === id
            ? { ...notification, isRead: true }
            : notification,
        ),
      );
    } catch (error) {
      console.error(
        error.response?.data?.message || "Failed to mark notification as read",
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await API.put("/notifications/read-all");

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          isRead: true,
        })),
      );
    } catch (error) {
      console.error(
        error.response?.data?.message ||
          "Failed to mark all notifications as read",
      );
    }
  };

  const themedStyles = {
    container: {
      ...styles.container,
      background: darkMode ? "#0f172a" : "#f8fafc",
      color: darkMode ? "#f8fafc" : "#111827",
      minHeight: "100vh",
    },
    subtext: {
      ...styles.subtext,
      color: darkMode ? "#cbd5e1" : "#666",
    },
    saveStatus: {
      ...styles.saveStatus,
      color: darkMode ? "#cbd5e1" : "#555",
    },
    notesCount: {
      ...styles.notesCount,
      color: darkMode ? "#cbd5e1" : "#666",
    },
    userInfo: {
      ...styles.userInfo,
      background: darkMode ? "#1e293b" : "#f5f5f5",
    },
    userName: {
      ...styles.userName,
      color: darkMode ? "#fff" : "#111",
    },
    userEmail: {
      ...styles.userEmail,
      color: darkMode ? "#cbd5e1" : "#666",
    },
    searchInput: {
      ...styles.searchInput,
      background: darkMode ? "#1e293b" : "#fff",
      color: darkMode ? "#fff" : "#111",
      border: darkMode ? "1px solid #475569" : "1px solid #d1d5db",
    },
    notificationPanel: {
      ...styles.notificationPanel,
      background: darkMode ? "#1e293b" : "#fff",
      border: darkMode ? "1px solid #334155" : "1px solid #ddd",
    },
    notificationTitle: {
      ...styles.notificationTitle,
      color: darkMode ? "#fff" : "#111",
    },
    notificationEmpty: {
      ...styles.notificationEmpty,
      color: darkMode ? "#cbd5e1" : "#666",
    },
    markAllButton: {
      ...styles.markAllButton,
      color: darkMode ? "#93c5fd" : "#2563eb",
    },
    toggleButton: {
      ...styles.toggleButton,
      background: darkMode ? "#f8fafc" : "#111",
      color: darkMode ? "#111" : "#fff",
    },
  };

  return (
    <div style={themedStyles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>SyncPad Dashboard</h1>
          <p style={themedStyles.subtext}>Manage your notes in one place</p>
        </div>

        <div style={styles.userSection}>
          <button
            onClick={() => setDarkMode((prev) => !prev)}
            style={themedStyles.toggleButton}
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>

          <div style={styles.notificationWrapper}>
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              style={styles.bellButton}
            >
              🔔
              {unreadCount > 0 && (
                <span style={styles.badge}>{unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <div style={themedStyles.notificationPanel}>
                <div style={styles.notificationHeader}>
                  <h3 style={themedStyles.notificationTitle}>Notifications</h3>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      style={themedStyles.markAllButton}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {loadingNotifications ? (
                  <p style={themedStyles.notificationEmpty}>Loading...</p>
                ) : notifications.length === 0 ? (
                  <p style={themedStyles.notificationEmpty}>No notifications yet</p>
                ) : (
                  <div style={styles.notificationList}>
                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        style={{
                          ...styles.notificationItem,
                          background: notification.isRead
                            ? darkMode
                              ? "#334155"
                              : "#fff"
                            : darkMode
                              ? "#1d4ed8"
                              : "#eff6ff",
                          border: darkMode
                            ? "1px solid #475569"
                            : "1px solid #e5e7eb",
                        }}
                      >
                        <p
                          style={{
                            ...styles.notificationMessage,
                            color: darkMode ? "#fff" : "#111",
                          }}
                        >
                          {notification.message}
                        </p>

                        <p
                          style={{
                            ...styles.notificationMeta,
                            color: darkMode ? "#cbd5e1" : "#666",
                          }}
                        >
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>

                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification._id)}
                            style={styles.markReadButton}
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={themedStyles.userInfo}>
            <span style={styles.userIcon}>👤</span>
            <div>
              <p style={themedStyles.userName}>{user.name}</p>
              <p style={themedStyles.userEmail}>{user.email}</p>
            </div>
          </div>

          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>
<button
  onClick={() => navigate("/settings")}
  style={{
    padding: "10px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  }}
>
  ⚙️ Settings
</button>
      <NoteForm
        title={title}
        content={content}
        tags={tags}
        setTitle={setTitle}
        setContent={setContent}
        setTags={setTags}
        editingId={editingId}
        handleSubmit={handleSubmit}
        handleCancelEdit={handleCancelEdit}
        user={user}
      />

      {editingId && saveStatus && (
        <p style={themedStyles.saveStatus}>{saveStatus}</p>
      )}

      <div>
        <div style={styles.notesHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Your Notes</h2>
            <p style={themedStyles.notesCount}>
              Showing {filteredNotes.length} of {notes.length} notes
            </p>
          </div>

          <input
            type="text"
            placeholder="Search notes by title, content, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={themedStyles.searchInput}
          />
        </div>

        {loading ? (
          <p>Loading notes...</p>
        ) : notes.length === 0 ? (
          <p>No notes yet. Create your first note.</p>
        ) : filteredNotes.length === 0 ? (
          <p>No matching notes found.</p>
        ) : (
          <div style={styles.notesGrid}>
            {filteredNotes.map((note) => (
              <NoteCard
                key={note._id}
                note={note}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
                currentUserId={currentUserId}
                fetchNotes={fetchNotes}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "24px",
    maxWidth: "1100px",
    margin: "0 auto",
    transition: "all 0.3s ease",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    gap: "20px",
    flexWrap: "wrap",
  },
  heading: {
    margin: 0,
  },
  subtext: {
    marginTop: "6px",
    color: "#666",
  },
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    position: "relative",
  },
  toggleButton: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
  notificationWrapper: {
    position: "relative",
  },
  bellButton: {
    position: "relative",
    padding: "10px 14px",
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "18px",
  },
  badge: {
    position: "absolute",
    top: "-6px",
    right: "-6px",
    background: "#e11d48",
    color: "#fff",
    borderRadius: "999px",
    minWidth: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "700",
    padding: "0 6px",
  },
  notificationPanel: {
    position: "absolute",
    top: "52px",
    right: 0,
    width: "340px",
    maxHeight: "420px",
    overflowY: "auto",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    zIndex: 100,
    padding: "14px",
  },
  notificationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
  },
  notificationTitle: {
    margin: 0,
    fontSize: "16px",
  },
  markAllButton: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },
  notificationList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  notificationItem: {
    borderRadius: "10px",
    padding: "12px",
  },
  notificationMessage: {
    margin: "0 0 8px 0",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  notificationMeta: {
    margin: "0 0 8px 0",
    fontSize: "12px",
  },
  markReadButton: {
    padding: "6px 10px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: "12px",
  },
  notificationEmpty: {
    margin: 0,
    fontSize: "14px",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    borderRadius: "10px",
  },
  userIcon: {
    fontSize: "18px",
  },
  userName: {
    margin: 0,
    fontSize: "14px",
    fontWeight: "600",
  },
  userEmail: {
    margin: 0,
    fontSize: "12px",
  },
  logoutButton: {
    padding: "10px 16px",
    background: "black",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  notesHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  sectionTitle: {
    margin: 0,
  },
  notesCount: {
    margin: "6px 0 0 0",
    fontSize: "14px",
  },
  searchInput: {
    padding: "10px 14px",
    width: "320px",
    maxWidth: "100%",
    borderRadius: "10px",
    outline: "none",
    fontSize: "14px",
  },
  notesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
    marginTop: "16px",
  },
  saveStatus: {
    marginTop: "-10px",
    marginBottom: "16px",
    fontSize: "14px",
  },
};

export default Dashboard;