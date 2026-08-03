import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "query_user" },
);

const documentSchema = new Schema(
  {
    fileName: { type: String, required: true },
    uploadDate: { type: Date, required: true },
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "ready", "failed"],
      required: true,
    },
    storagePath: { type: String, required: true },
    pageCount: { type: Number },
  },
  { collection: "document" },
);

const chatSchema = new Schema(
  {
    sessionId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    sourceDocument: { type: String },
    sourcePage: { type: Number },
    suggestedQuestions: [{ type: String }],
    timestamp: { type: Date, default: Date.now },
  },
  { collection: "chat" },
);

const User = model("User", userSchema);
const Document = model("Document", documentSchema);
const Chat = model("Chat", chatSchema);

export { User, Document, Chat };
