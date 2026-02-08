import React from 'react';
// import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../../lib/utils';
import type { Message } from './types';

interface ChatMessageProps {
    message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const isBot = message.role === 'assistant';

    // Defensive check
    if (!message || !message.content) {
        return null; // Don't render broken messages
    }

    return (
        <div className={cn("flex gap-3 mb-4", isBot ? "flex-row" : "flex-row-reverse")}>
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                isBot ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
                {isBot ? "AI" : "You"}
            </div>

            <div className={cn(
                "max-w-[80%] rounded-lg p-3 text-sm overflow-hidden",
                isBot ? "bg-muted/50 text-foreground" : "bg-primary text-primary-foreground"
            )}>
                <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>

                {isBot && message.sources && Array.isArray(message.sources) && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Sources:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                            {message.sources
                                .filter((s, i, self) => i === self.findIndex((t) => t.source === s.source))
                                .map((s, i) => (
                                    <li key={i} className="truncate max-w-[200px] hover:text-foreground transition-colors">
                                        <a href={s.source} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-primary transition-colors cursor-pointer">
                                            {s.source ? (typeof s.source === 'string' && (s.source.includes('http') || s.source.startsWith('/')) ? new URL(s.source, 'http://dummy.com').pathname.split('/').pop() || s.source : s.source) : 'Unknown Source'}
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
