import { randomUUID } from "node:crypto";
import { createClient } from "redis";

/**
 * Redis pub/sub clients for backend <-> python-ai communication.
 * Subscribe mode requires a dedicated connection, so two clients are used.
 */
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redisPub = createClient({ url: redisUrl });
export const redisSub = createClient({ url: redisUrl });

const connectOnce = (client: typeof redisPub): Promise<typeof redisPub> => {
  if (!client.isOpen) {
    return client.connect() as Promise<typeof redisPub>;
  }
  return Promise.resolve(client);
};

/**
 * Publish a payload to `channel` and wait for a correlated reply.
 *
 * The payload is augmented with a `correlationId` and `replyChannel` so the
 * consumer (e.g. python-ai) knows where to send its response. Resolves with
 * the parsed JSON reply, or rejects after `timeoutMs` if no reply arrives.
 */
export async function publishAndWait(
  channel: string,
  payload: object,
  timeoutMs = 30000,
): Promise<any> {
  const correlationId = randomUUID();
  const replyChannel = `reply:${correlationId}`;

  const [pub, sub] = await Promise.all([connectOnce(redisPub), connectOnce(redisSub)]);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      void sub.unsubscribe(replyChannel).finally(() => {
        reject(new Error(`publishAndWait: timed out after ${timeoutMs}ms waiting on ${replyChannel}`));
      });
    }, timeoutMs);

    const onMessage = (message: string) => {
      clearTimeout(timer);
      void sub.unsubscribe(replyChannel).finally(() => {
        try {
          resolve(JSON.parse(message));
        } catch (err) {
          reject(err);
        }
      });
    };

    sub
      .subscribe(replyChannel, onMessage)
      .then(() =>
        pub.publish(
          channel,
          JSON.stringify({
            ...payload,
            correlationId,
            replyChannel,
          }),
        ),
      )
      .catch((err) => {
        clearTimeout(timer);
        void sub.unsubscribe(replyChannel).finally(() => reject(err));
      });
  });
}
