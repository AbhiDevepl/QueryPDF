"use client";

import { env } from "@QueryPDF/env/web";
import { Send, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Streamdown } from "streamdown";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function AIPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setStreamingContent("");

      try {
        const response = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) throw new Error("Failed to send message");

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    fullContent += parsed.content;
                    setStreamingContent(fullContent);
                  }
                } catch {
                  // Ignore parsing errors for incomplete chunks
                }
              }
            }
          }
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: fullContent,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent("");
      } catch (error) {
        console.error("Failed to send message:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [messages],
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage(text);
  };

  return (
    <div className="grid grid-rows-[1fr_auto] overflow-hidden w-full mx-auto p-4">
      <div className="overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && !streamingContent ? (
          <div className="text-center text-muted-foreground mt-8">
            Ask me anything to get started!
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg ${
                  message.role === "user" ? "bg-primary/10 ml-8" : "bg-secondary/20 mr-8"
                }`}
              >
                <p className="text-sm font-semibold mb-1">
                  {message.role === "user" ? "You" : "AI Assistant"}
                </p>
                <Streamdown>{message.content}</Streamdown>
              </div>
            ))}
            {streamingContent && (
              <div className="p-3 rounded-lg bg-secondary/20 mr-8">
                <p className="text-sm font-semibold mb-1">AI Assistant</p>
                <Streamdown isAnimating>{streamingContent}</Streamdown>
              </div>
            )}
          </>
        )}
        {isLoading && !streamingContent && (
          <div className="p-3 rounded-lg bg-secondary/20 mr-8">
            <p className="text-sm font-semibold mb-1">AI Assistant</p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="w-full flex items-center space-x-2 pt-2 border-t">
        <Input
          name="prompt"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1"
          autoComplete="off"
          autoFocus
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={18} />}
        </Button>
      </form>
    </div>
  );
}
