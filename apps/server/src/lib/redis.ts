import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redisPub = createClient({ url: REDIS_URL });
export const redisSub = createClient({ url: REDIS_URL });

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
}
