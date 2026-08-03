import { google } from "@ai-sdk/google";
import { createContext } from "@QueryPDF/api/context";
import { appRouter } from "@QueryPDF/api/routers/index";
import { auth } from "@QueryPDF/auth";
import { env } from "@QueryPDF/env/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";

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
