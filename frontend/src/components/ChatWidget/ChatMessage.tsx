import React from "react";

import ReactMarkdown from "react-markdown";
import { cn } from "../../shared/lib/utils";
import type { Message } from "./types";

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.role === "assistant";

  // Defensive check
  if (!message || !message.content) {
    return null; // Don't render broken messages
  }

  return (
    <div className={cn("mb-4 flex gap-3", isBot ? "flex-row" : "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isBot ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        {isBot ? "AI" : "You"}
      </div>

      <div
        className={cn(
          "max-w-[80%] overflow-hidden rounded-lg p-3 text-sm",
          isBot ? "bg-muted/50 text-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {isBot &&
          message.sources &&
          Array.isArray(message.sources) &&
          message.sources.length > 0 && (
            <div className="border-border/50 text-muted-foreground mt-2 border-t pt-2 text-xs">
              <p className="mb-1 font-medium">Sources:</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {message.sources
                  .filter((s, i, self) => i === self.findIndex((t) => t.source === s.source))
                  .map((s, i) => (
                    <li
                      key={i}
                      className="hover:text-foreground max-w-[200px] truncate transition-colors"
                    >
                      <a
                        href={s.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary cursor-pointer underline decoration-dotted transition-colors"
                      >
                        {s.source
                          ? typeof s.source === "string" &&
                            (s.source.includes("http") || s.source.startsWith("/"))
                            ? new URL(s.source, "http://dummy.com").pathname.split("/").pop() ||
                            s.source
                            : s.source
                          : "Unknown Source"}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          )}
      </div>
    </div>
  );
};
