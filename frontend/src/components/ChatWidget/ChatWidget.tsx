import "./ChatWidget.css";
import { MessageCircle, Minimize2, Send } from "lucide-react";
import { useChatWidget } from "./useChatWidget";
import { ChatMessage } from "./ChatMessage";
import { SuggestedQuestions } from "./SuggestedQuestions";

const ChatWidget = () => {
  const {
    isOpen,
    setIsOpen,
    messages,
    input,
    setInput,
    isLoading,
    suggestions,
    sendMessage,
    scrollRef
  } = useChatWidget();

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-background text-foreground border-border chat-widget-enter mb-4 flex h-[600px] w-[380px] flex-col overflow-hidden rounded-xl border shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-kleff flex items-center justify-between p-4 text-black">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              <h3 className="font-semibold">Kleff Assistant</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-primary/20 rounded-md p-1 transition-colors"
                title="Minimize"
              >
                <Minimize2 size={18} />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-muted/10 relative flex-1 overflow-hidden">
            <div className="scrollbar-hide h-full overflow-y-auto p-4" ref={scrollRef}>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {isLoading && (
                <div className="mb-4 flex gap-2">
                  <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  </div>
                  <div className="bg-muted/50 text-foreground/50 animate-pulse rounded-lg p-3 text-sm">
                    Thinking...
                  </div>
                </div>
              )}

              {!isLoading && messages.length < 3 && (
                <SuggestedQuestions suggestions={suggestions} onSelect={sendMessage} />
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-background border-border border-t p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about deployment..."
                className="bg-muted/30 border-input focus:ring-primary flex-1 rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-primary text-primary-foreground rounded-md p-2 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
            <div className="text-muted-foreground mt-2 text-center text-[10px]">
              AI-generated answers based on documentation.
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary text-primary-foreground flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform duration-200 hover:scale-105"
          aria-label="Open chat"
          title="Open chat"
        >
          <MessageCircle size={28} />
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
