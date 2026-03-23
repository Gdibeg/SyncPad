const Note = require("../models/Note");
const User = require("../models/User");
const createNotification = require("../utils/createNotification");

// POST /api/notes
const createNote = async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    if (!title) {
      return res.status(400).json({
        message: "Title is required",
      });
    }

    const cleanedTags = Array.isArray(tags)
      ? [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))]
      : [];

    const note = await Note.create({
      title,
      content: content || "",
      tags: cleanedTags,
      owner: req.user.id,
      sharedWith: [],
      versions: [],
      isPinned: false,
    });

    const populatedNote = await Note.findById(note._id)
      .populate("owner", "name email")
      .populate("sharedWith", "name email");

    res.status(201).json(populatedNote);
  } catch (error) {
    console.error("Create note error:", error.message);
    res.status(500).json({
      message: "Server error while creating note",
    });
  }
};

// GET /api/notes
const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({
      $or: [{ owner: req.user.id }, { sharedWith: req.user.id }],
    })
      .populate("owner", "name email")
      .populate("sharedWith", "name email")
      .sort({
        updatedAt: -1,
      });

    res.status(200).json(notes);
  } catch (error) {
    console.error("Get notes error:", error.message);
    res.status(500).json({
      message: "Server error while fetching notes",
    });
  }
};

// GET /api/notes/:id
const getSingleNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate("owner", "name email")
      .populate("sharedWith", "name email");

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    const isOwner = note.owner._id.toString() === req.user.id;
    const isSharedUser = (note.sharedWith || []).some(
      (user) => user._id.toString() === req.user.id,
    );

    if (!isOwner && !isSharedUser) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    res.status(200).json(note);
  } catch (error) {
    console.error("Get single note error:", error.message);
    res.status(500).json({
      message: "Server error while fetching note",
    });
  }
};

// PUT /api/notes/:id
const updateNote = async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const isOwner = note.owner.toString() === req.user.id;
    const isSharedUser = (note.sharedWith || []).some(
      (userId) => userId.toString() === req.user.id,
    );

    if (!isOwner && !isSharedUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    const cleanedTags = Array.isArray(tags)
      ? [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))]
      : note.tags || [];

    const newTitle = title ?? note.title;
    const newContent = content ?? note.content;
    const newTags = cleanedTags;

    const titleChanged = note.title !== newTitle;
    const contentChanged = note.content !== newContent;
    const tagsChanged =
      JSON.stringify(note.tags || []) !== JSON.stringify(newTags);

    if (titleChanged || contentChanged || tagsChanged) {
      note.versions.push({
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        editedAt: new Date(),
      });

      note.title = newTitle;
      note.content = newContent;
      note.tags = newTags;

      if (note.versions.length > 10) {
        note.versions = note.versions.slice(-10);
      }
    }

    await note.save();

    if (
      (titleChanged || contentChanged || tagsChanged) &&
      note.sharedWith?.length > 0
    ) {
      const recipients = [];

      if (note.owner.toString() !== req.user.id) {
        recipients.push(note.owner.toString());
      }

      note.sharedWith.forEach((userId) => {
        if (userId.toString() !== req.user.id) {
          recipients.push(userId.toString());
        }
      });

      for (const recipientId of recipients) {
        await createNotification({
          recipient: recipientId,
          sender: req.user.id,
          senderName: req.user.name,
          note: note._id,
          type: "update",
          message: `${req.user.name} updated the note "${note.title}"`,
        });
      }
    }

    const updatedNote = await Note.findById(note._id)
      .populate("owner", "name email")
      .populate("sharedWith", "name email");

    req.app.get("io").emit("note-updated", updatedNote);

    res.json(updatedNote);
  } catch (error) {
    console.error("Update note error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/notes/:id/pin
const togglePinNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.owner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only owner can pin or unpin this note",
      });
    }

    note.isPinned = !note.isPinned;
    await note.save();

    const updatedNote = await Note.findById(note._id)
      .populate("owner", "name email")
      .populate("sharedWith", "name email");

    req.app.get("io").emit("note-updated", updatedNote);

    res.status(200).json(updatedNote);
  } catch (error) {
    console.error("Toggle pin error:", error.message);
    res.status(500).json({
      message: "Server error while updating pin status",
    });
  }
};

// DELETE /api/notes/:id
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    if (!note.owner) {
      return res.status(500).json({
        message: "Note owner missing",
      });
    }

    const ownerId = note.owner.toString();

    if (ownerId !== req.user.id) {
      return res.status(403).json({
        message: "Only owner can delete this note",
      });
    }

    await Note.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Delete note error:", error);
    return res.status(500).json({
      message: "Server error while deleting note",
      error: error.message,
    });
  }
};

// POST /api/notes/:noteId/share
const shareNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const note = await Note.findById(noteId);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.owner.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only owner can share this note" });
    }

    const userToShare = await User.findOne({ email });

    if (!userToShare) {
      return res
        .status(404)
        .json({ message: "User with this email not found" });
    }

    if (userToShare._id.toString() === req.user.id) {
      return res.status(400).json({ message: "You already own this note" });
    }

    const alreadyShared = (note.sharedWith || []).some(
      (userId) => userId.toString() === userToShare._id.toString(),
    );

    if (alreadyShared) {
      return res
        .status(400)
        .json({ message: "Note already shared with this user" });
    }

    note.sharedWith.push(userToShare._id);
    await note.save();

    await createNotification({
      recipient: userToShare._id,
      sender: req.user.id,
      senderName: req.user.name,
      note: note._id,
      type: "share",
      message: `${req.user.name} shared the note "${note.title}" with you`,
    });

    const updatedNote = await Note.findById(noteId)
      .populate("owner", "name email")
      .populate("sharedWith", "name email");

    res.status(200).json({
      message: "Note shared successfully",
      note: updatedNote,
    });
  } catch (error) {
    console.error("Share note error:", error.message);
    res.status(500).json({ message: "Server error while sharing note" });
  }
};

// GET /api/notes/:id/versions
const getNoteVersions = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .select("versions owner sharedWith")
      .populate("sharedWith", "name email");

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const isOwner = note.owner.toString() === req.user.id;
    const isSharedUser = (note.sharedWith || []).some(
      (user) => user._id.toString() === req.user.id,
    );

    if (!isOwner && !isSharedUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(note.versions.slice().reverse());
  } catch (error) {
    console.error("Get versions error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/notes/:noteId/restore/:versionId
// PUT /api/notes/:noteId/restore/:versionId
const restoreVersion = async (req, res) => {
  try {
    const note = await Note.findById(req.params.noteId);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const isOwner = note.owner.toString() === req.user.id;
    const isSharedUser = (note.sharedWith || []).some(
      (userId) => userId.toString() === req.user.id,
    );

    if (!isOwner && !isSharedUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    const version = note.versions.id(req.params.versionId);

    if (!version) {
      return res.status(404).json({ message: "Version not found" });
    }

    const restoredTags = version.tags || [];

    const titleChanged = note.title !== version.title;
    const contentChanged = note.content !== version.content;
    const tagsChanged =
      JSON.stringify(note.tags || []) !== JSON.stringify(restoredTags);

    if (titleChanged || contentChanged || tagsChanged) {
      note.versions.push({
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        editedAt: new Date(),
      });

      note.title = version.title;
      note.content = version.content;
      note.tags = restoredTags;

      if (note.versions.length > 10) {
        note.versions = note.versions.slice(-10);
      }
    }

    await note.save();

    const updatedNote = await Note.findById(note._id)
      .populate("owner", "name email")
      .populate("sharedWith", "name email");

    req.app.get("io").emit("note-updated", updatedNote);

    res.json(updatedNote);
  } catch (error) {
    console.error("Restore version error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createNote,
  getNotes,
  getSingleNote,
  updateNote,
  togglePinNote,
  deleteNote,
  shareNote,
  getNoteVersions,
  restoreVersion,
};
