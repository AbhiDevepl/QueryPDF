import { google } from "@ai-sdk/google";
import { createContext } from "@QueryPDF/api/context";
import { appRouter } from "@QueryPDF/api/routers/index";
import { auth } from "@QueryPDF/auth";
import { Chat, Document } from "@QueryPDF/db";
import { env } from "@QueryPDF/env/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { publishAndWait } from "./lib/redisRequest";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.all("/api/auth{/*path}", toNodeHandler(auth));

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.use(express.json());

const askSchema = z.object({
  sessionId: z.string().min(1),
  question: z.string().min(1),
});

app.get("/admin/dashboard/stats", async (req, res) => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const [totalDocuments, chatSessions, totalQuestions, recentDocuments] = await Promise.all([
    Document.countDocuments(),
    Chat.distinct("sessionId"),
    Chat.countDocuments(),
    Document.find().sort({ uploadDate: -1 }).limit(5).lean(),
  ]);

  res.json({
    totalDocuments,
    totalChatSessions: chatSessions.length,
    totalQuestions,
    recentDocuments,
  });
});

app.post("/chat/ask", async (req, res) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const { sessionId, question } = parsed.data;

  try {
    const reply = await publishAndWait("ask_question", { sessionId, question });
    const chat = await Chat.create({
      sessionId,
      question,
      answer: reply.answer ?? "",
      sourceDocument: reply.sourceDocument,
      sourcePage: reply.sourcePage,
      suggestedQuestions: reply.suggestedQuestions,
    });
    res.json(chat);
  } catch (error) {
    console.error("[chat:ask]", error);
    res.status(500).json({ error: "Failed to get answer" });
  }
});

app.get("/chat/history/:sessionId", async (req, res) => {
  const chats = await Chat.find({ sessionId: req.params.sessionId })
    .sort({ timestamp: 1 })
    .lean();
  res.json(chats);
});

app.post("/ai", async (req, res) => {
  const { messages = [] } = (req.body || {}) as { messages: UIMessage[] };
  const model = google("gemini-2.5-flash");
  const result = streamText({
    model,
    messages: await convertToModelMessages(messages),
  });
  result.pipeUIMessageStreamToResponse(res);
});

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
