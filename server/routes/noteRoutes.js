const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createNote,
  getNotes,
  getSingleNote,
  updateNote,
  togglePinNote,
  deleteNote,
  shareNote,
  getNoteVersions,
  restoreVersion,
} = require("../controllers/noteController");

// Create + Get all notes
router.route("/").post(protect, createNote).get(protect, getNotes);

// Get single note
router.get("/:id", protect, getSingleNote);

// Update + Delete
router.route("/:id").put(protect, updateNote).delete(protect, deleteNote);

// Pin / Unpin
router.put("/:id/pin", protect, togglePinNote);

// Share note
router.post("/:noteId/share", protect, shareNote);

// Version history
router.get("/:id/versions", protect, getNoteVersions);
router.put("/:noteId/restore/:versionId", protect, restoreVersion);

module.exports = router;
