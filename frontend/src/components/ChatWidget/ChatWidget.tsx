import './ChatWidget.css';
import { MessageCircle, Minimize2, Send } from 'lucide-react';
import { useChatWidget } from './useChatWidget';
import { ChatMessage } from './ChatMessage';
import { SuggestedQuestions } from './SuggestedQuestions';

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
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-[380px] h-[600px] bg-background text-foreground border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden chat-widget-enter">
                    {/* Header */}
                    <div className="p-4 bg-gradient-kleff text-black flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <h3 className="font-semibold">Kleff Assistant</h3>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-primary/20 rounded-md transition-colors"
                                title="Minimize"
                            >
                                <Minimize2 size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden relative bg-muted/10">
                        <div className="h-full overflow-y-auto p-4 scrollbar-hide" ref={scrollRef}>
                            {messages.map((msg) => (
                                <ChatMessage key={msg.id} message={msg} />
                            ))}

                            {isLoading && (
                                <div className="flex gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    </div>
                                    <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground/50 animate-pulse">
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
                    <div className="p-4 bg-background border-t border-border">
                        <form
                            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                            className="flex gap-2"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about deployment..."
                                className="flex-1 bg-muted/30 border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="bg-primary text-primary-foreground p-2 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                        <div className="text-[10px] text-center mt-2 text-muted-foreground">
                            Powered by OpenAI. Answers generated from documentation.
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform duration-200"
                >
                    <MessageCircle size={28} />
                </button>
            )}
        </div>
    );
};

export default ChatWidget;
