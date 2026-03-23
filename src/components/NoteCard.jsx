import React, { useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";

function NoteCard({
  note,
  handleEdit,
  handleDelete,
  currentUserId,
  fetchNotes,
  darkMode = false,
}) {
  const ownerId = note.owner?._id || "";
  const ownerEmail = note.owner?.email || "Unknown owner";
  const sharedCount = note.sharedWith?.length || 0;

  const [shareEmail, setShareEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  const isOwner = ownerId && currentUserId && ownerId === currentUserId;

  const handleShare = async () => {
    if (!shareEmail.trim()) {
      toast.error("Please enter an email");
      return;
    }

    try {
      setSharing(true);

      await API.post(`/notes/${note._id}/share`, {
        email: shareEmail.trim(),
      });

      toast.success("Note shared successfully");
      setShareEmail("");

      if (fetchNotes) {
        fetchNotes();
      }
    } catch (error) {
      console.error(error.response?.data?.message || "Failed to share note");
      toast.error(error.response?.data?.message || "Failed to share note");
    } finally {
      setSharing(false);
    }
  };

  const handleTogglePin = async () => {
    try {
      setPinLoading(true);
      await API.put(`/notes/${note._id}/pin`);

      toast.success(
        note.isPinned ? "Note unpinned successfully" : "Note pinned successfully",
      );

      if (fetchNotes) {
        fetchNotes();
      }
    } catch (error) {
      console.error(error.response?.data?.message || "Failed to update pin");
      toast.error(error.response?.data?.message || "Failed to update pin");
    } finally {
      setPinLoading(false);
    }
  };

  const themedStyles = {
    card: {
      ...styles.card,
      background: darkMode ? "#1e293b" : "#fff",
      boxShadow: darkMode
        ? "0 0 10px rgba(0,0,0,0.25)"
        : "0 0 10px rgba(0,0,0,0.08)",
      border: note.isPinned
        ? "2px solid #f59e0b"
        : darkMode
          ? "1px solid #334155"
          : "none",
    },
    title: {
      ...styles.title,
      color: darkMode ? "#f8fafc" : "#111827",
    },
    meta: {
      ...styles.meta,
      color: darkMode ? "#cbd5e1" : "#666",
    },
    tag: {
      ...styles.tag,
      background: darkMode ? "#312e81" : "#eef2ff",
      color: darkMode ? "#c7d2fe" : "#4338ca",
    },
    content: {
      ...styles.content,
      color: darkMode ? "#e2e8f0" : "#444",
    },
    shareSection: {
      ...styles.shareSection,
      background: darkMode ? "#0f172a" : "#f8fafc",
      border: darkMode ? "1px solid #334155" : "1px solid #e5e7eb",
    },
    shareLabel: {
      ...styles.shareLabel,
      color: darkMode ? "#f8fafc" : "#333",
    },
    shareInput: {
      ...styles.shareInput,
      background: darkMode ? "#1e293b" : "#fff",
      color: darkMode ? "#fff" : "#111",
      border: darkMode ? "1px solid #475569" : "1px solid #ccc",
    },
  };

  return (
    <div style={themedStyles.card}>
      <div style={styles.topRow}>
        <div style={styles.titleWrap}>
          <h3 style={themedStyles.title}>
            {note.isPinned ? "📌 " : ""}
            {note.title || "Untitled Note"}
          </h3>
        </div>

        <span style={isOwner ? styles.ownerBadge : styles.sharedBadge}>
          {isOwner ? "Owner" : "Shared"}
        </span>
      </div>

      <p style={themedStyles.meta}>
        <strong>Owner:</strong> {ownerEmail}
      </p>

      <p style={themedStyles.meta}>
        <strong>Shared with:</strong> {sharedCount} user
        {sharedCount !== 1 ? "s" : ""}
      </p>

      {note.tags?.length > 0 && (
        <div style={styles.tagsContainer}>
          {note.tags.map((tag, index) => (
            <span key={index} style={themedStyles.tag}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      <p style={themedStyles.content}>{note.content || "No content"}</p>

      {isOwner && (
        <div style={themedStyles.shareSection}>
          <p style={themedStyles.shareLabel}>Share this note</p>

          <div style={styles.shareRow}>
            <input
              type="email"
              placeholder="Enter user email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              style={themedStyles.shareInput}
            />

            <button
              onClick={handleShare}
              style={styles.shareBtn}
              disabled={sharing}
            >
              {sharing ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>
      )}

      <div style={styles.buttons}>
        <button onClick={() => handleEdit(note)} style={styles.editBtn}>
          Edit
        </button>

        {isOwner && (
          <button
            onClick={handleTogglePin}
            style={note.isPinned ? styles.unpinBtn : styles.pinBtn}
            disabled={pinLoading}
          >
            {pinLoading ? "Please wait..." : note.isPinned ? "Unpin" : "Pin"}
          </button>
        )}

        {isOwner && (
          <button
            onClick={() => handleDelete(note._id)}
            style={styles.deleteBtn}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    padding: "20px",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    marginTop: 0,
    marginBottom: "4px",
    fontSize: "18px",
    wordBreak: "break-word",
  },
  ownerBadge: {
    background: "#111",
    color: "#fff",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
    flexShrink: 0,
  },
  sharedBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
    flexShrink: 0,
  },
  meta: {
    margin: 0,
    fontSize: "13px",
    wordBreak: "break-word",
  },
  tagsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "6px",
  },
  tag: {
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
  },
  content: {
    lineHeight: "1.6",
    wordBreak: "break-word",
    overflowWrap: "break-word",
    whiteSpace: "pre-wrap",
    marginTop: "6px",
  },
  shareSection: {
    marginTop: "12px",
    padding: "12px",
    borderRadius: "10px",
  },
  shareLabel: {
    margin: "0 0 8px 0",
    fontSize: "13px",
    fontWeight: "600",
  },
  shareRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  shareInput: {
    flex: 1,
    minWidth: "180px",
    padding: "10px 12px",
    borderRadius: "8px",
    outline: "none",
  },
  shareBtn: {
    padding: "10px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  buttons: {
    display: "flex",
    gap: "10px",
    marginTop: "16px",
    flexWrap: "wrap",
  },
  editBtn: {
    padding: "10px 16px",
    background: "#222",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  pinBtn: {
    padding: "10px 16px",
    background: "#f59e0b",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  unpinBtn: {
    padding: "10px 16px",
    background: "#6b7280",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  deleteBtn: {
    padding: "10px 16px",
    background: "#e11d48",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
};

export default NoteCard;