import { useState, useRef, useEffect } from "react";
import { client } from "../../shared/lib/client";
import type { Message, Suggestion } from "./types";

export const useChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      fetchSuggestions();
      // Add initial greeting
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Hi! I can help you with questions about Kleff, our features, and pricing. What would you like to know?",
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const fetchSuggestions = async () => {
    try {
      // Use relative path proxied by Nginx or base URL from client
      const response = await client.get("/api/v1/chat/suggested-questions");
      setSuggestions(response.data);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await client.post("/api/v1/chat/message", { message: text });

      const botMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.data.message,
        sources: response.data.sources,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I'm having trouble connecting to the server. Please try again later.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    messages,
    input,
    setInput,
    isLoading,
    suggestions,
    sendMessage,
    scrollRef
  };
};
