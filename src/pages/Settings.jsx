import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../api/axios";

function Settings() {
  const navigate = useNavigate();

  const [name, setName] = useState(localStorage.getItem("userName") || "User");
  const email = localStorage.getItem("userEmail") || "";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const darkMode = localStorage.getItem("syncpad-theme") === "dark";

  const toggleTheme = () => {
    const newTheme = darkMode ? "light" : "dark";
    localStorage.setItem("syncpad-theme", newTheme);
    toast.success(`Switched to ${newTheme} mode`);

    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      const res = await API.put("/auth/update-profile", {
        name,
      });

      localStorage.setItem("userName", res.data.user.name);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error(error.response?.data?.message || "Failed to update profile");
      toast.error(error.response?.data?.message || "Failed to update profile");
    }
  };

  const handleChangePassword = async () => {
  if (!currentPassword || !newPassword) {
    toast.error("Fill all password fields");
    return;
  }

  if (newPassword.length < 6) {
    toast.error("New password must be at least 6 characters");
    return;
  }

  try {
    const res = await API.put("/auth/change-password", {
      currentPassword,
      newPassword,
    });

    toast.success(res.data.message || "Password updated successfully");
    setCurrentPassword("");
    setNewPassword("");
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error.response?.data || error.message);
    toast.error(
      error.response?.data?.message || "Failed to update password",
    );
  }
};

  const handleLogout = () => {
    localStorage.clear();
    toast.success("Logged out successfully");

    setTimeout(() => {
      navigate("/login");
    }, 500);
  };

  const themedStyles = {
    container: {
      ...styles.container,
      background: darkMode ? "#0f172a" : "#f8fafc",
      color: darkMode ? "#f8fafc" : "#111827",
      minHeight: "100vh",
    },
    card: {
      ...styles.card,
      background: darkMode ? "#1e293b" : "#fff",
      color: darkMode ? "#f8fafc" : "#111827",
      border: darkMode ? "1px solid #334155" : "none",
      boxShadow: darkMode
        ? "0 0 10px rgba(0,0,0,0.25)"
        : "0 0 10px rgba(0,0,0,0.08)",
    },
    subText: {
      ...styles.subText,
      color: darkMode ? "#cbd5e1" : "#555",
    },
    statBox: {
      ...styles.statBox,
      background: darkMode ? "#0f172a" : "#f1f5f9",
      color: darkMode ? "#fff" : "#111",
      border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
    },
    input: {
      ...styles.input,
      background: darkMode ? "#0f172a" : "#fff",
      color: darkMode ? "#fff" : "#111",
      border: darkMode ? "1px solid #475569" : "1px solid #ccc",
    },
  };

  return (
    <div style={themedStyles.container}>
      <div style={styles.topBar}>
        <h1 style={styles.heading}>⚙️ Settings</h1>
        <button onClick={() => navigate("/")} style={styles.backBtn}>
          ⬅ Back to Dashboard
        </button>
      </div>

      <div style={themedStyles.card}>
        <h2>👤 Profile</h2>

        <label style={styles.label}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={themedStyles.input}
        />

        <label style={styles.label}>Email</label>
        <input
          type="text"
          value={email}
          disabled
          style={themedStyles.input}
        />

        <button onClick={handleUpdateProfile} style={styles.primaryBtn}>
          Save Profile
        </button>
      </div>

      <div style={themedStyles.card}>
        <h2>📊 Quick Info</h2>
        <div style={styles.statsGrid}>
          <div style={themedStyles.statBox}>Real-time notes enabled</div>
          <div style={themedStyles.statBox}>Dark mode supported</div>
          <div style={themedStyles.statBox}>Notifications enabled</div>
          <div style={themedStyles.statBox}>Version history available</div>
        </div>
      </div>

      <div style={themedStyles.card}>
        <h2>🎨 Appearance</h2>
        <p style={themedStyles.subText}>
          Change how SyncPad looks for your current session.
        </p>
        <button onClick={toggleTheme} style={styles.primaryBtn}>
          {darkMode ? "☀️ Switch to Light" : "🌙 Switch to Dark"}
        </button>
      </div>

      <div style={themedStyles.card}>
        <h2>🔐 Account</h2>

        <p style={themedStyles.subText}>
          Log out of your current account securely.
        </p>

        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>

        <h3 style={{ marginTop: "20px" }}>🔑 Change Password</h3>

        <input
          type="password"
          placeholder="Current Password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          style={themedStyles.input}
        />

        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={themedStyles.input}
        />

        <button onClick={handleChangePassword} style={styles.primaryBtn}>
          Update Password
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "30px 20px",
    transition: "all 0.3s ease",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "24px",
  },
  heading: {
    margin: 0,
  },
  card: {
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "20px",
  },
  subText: {
    marginTop: "10px",
    fontSize: "14px",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    marginTop: "12px",
    fontWeight: "600",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    marginBottom: "12px",
    boxSizing: "border-box",
    outline: "none",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginTop: "12px",
  },
  statBox: {
    padding: "14px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
  },
  primaryBtn: {
    padding: "10px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  logoutBtn: {
    padding: "10px 16px",
    background: "#e11d48",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "8px",
  },
  backBtn: {
    padding: "10px 16px",
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
};

export default Settings;