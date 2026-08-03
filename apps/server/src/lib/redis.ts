import { Document } from "@QueryPDF/db";
import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redisPub = createClient({ url: REDIS_URL });
export const redisSub = createClient({ url: REDIS_URL });

async function subscribeDocumentStatus(): Promise<void> {
  await redisSub.subscribe("document_status", async (message) => {
    try {
      const { documentId, status, pageCount } = JSON.parse(message);
      await Document.updateOne(
        { _id: documentId },
        { $set: { processingStatus: status, ...(pageCount != null && { pageCount }) } },
      );
      console.log(`[redis:document_status] ${documentId} -> ${status}`);
    } catch (error) {
      console.error("[redis:document_status] handler error:", error);
    }
  });
}

export async function connectRedis(): Promise<void> {
  for (const [name, client] of [
    ["pub", redisPub],
    ["sub", redisSub],
  ] as const) {
    try {
      await client.connect();
      console.log(`[redis:${name}] connected to ${REDIS_URL}`);
    } catch (error) {
      console.error(`[redis:${name}] connection failed:`, error);
    }
  }
  try {
    await subscribeDocumentStatus();
  } catch (error) {
    console.error("[redis:document_status] subscribe failed:", error);
  }
}
