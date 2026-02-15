export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  sources?: { source: string; score: number }[];
}

export interface Suggestion {
  id: string;
  text: string;
  category: string;
}


