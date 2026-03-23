const mongoose = require("mongoose");

const versionSchema = new mongoose.Schema({
  title: String,
  content: String,
  tags: {
    type: [String],
    default: [],
  },
  editedAt: {
    type: Date,
    default: Date.now,
  },
});

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sharedWith: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    versions: [versionSchema],
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Note", noteSchema);
