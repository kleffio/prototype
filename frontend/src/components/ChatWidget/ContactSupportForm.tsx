import React, { useState } from "react";
import { Send, ArrowLeft, Loader2 } from "lucide-react";
import axios from "axios";
import type { Message } from "./types";

interface ContactSupportFormProps {
  history: Message[];
  onCancel: () => void;
  onSubmitSuccess: () => void;
}

export const ContactSupportForm: React.FC<ContactSupportFormProps> = ({
  history,
  onCancel,
  onSubmitSuccess
}) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await axios.post("http://localhost:8086/api/v1/support/ticket", {
        contactEmail: email,
        message: message,
        history: history.slice(-5) // Send last 5 messages for context
      });
      onSubmitSuccess();
    } catch {
      setError("Failed to send support ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in flex h-full flex-col p-4 duration-300">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={onCancel}
          className="hover:bg-muted text-muted-foreground hover:text-foreground rounded p-1"
        >
          <ArrowLeft size={18} />
        </button>
        <h3 className="text-sm font-semibold">Contact Support</h3>
      </div>

      <p className="text-muted-foreground mb-4 text-xs">
        We'll use your current conversation history to help our team understand your issue.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-background focus:ring-primary w-full rounded-md border p-2 text-sm focus:ring-1"
            placeholder="you@company.com"
          />
        </div>

        <div className="flex flex-1 flex-col space-y-1">
          <label className="text-xs font-medium">Additional Details</label>
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-background focus:ring-primary w-full flex-1 resize-none rounded-md border p-2 text-sm focus:ring-1"
            placeholder="Please describe what you are trying to achieve..."
          />
        </div>

        {error && <p className="text-destructive text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-md py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          Send Ticket
        </button>
      </form>
    </div>
  );
};
