import React, { useState } from 'react';
import { Send, ArrowLeft, Loader2 } from 'lucide-react';
import axios from 'axios';
import type { Message } from './types';

interface ContactSupportFormProps {
    history: Message[];
    onCancel: () => void;
    onSubmitSuccess: () => void;
}

export const ContactSupportForm: React.FC<ContactSupportFormProps> = ({ history, onCancel, onSubmitSuccess }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await axios.post('http://localhost:8086/api/v1/support/ticket', {
                contactEmail: email,
                message: message,
                history: history.slice(-5) // Send last 5 messages for context
            });
            onSubmitSuccess();
        } catch (err) {
            setError('Failed to send support ticket. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full p-4 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2 mb-4">
                <button onClick={onCancel} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={18} />
                </button>
                <h3 className="font-semibold text-sm">Contact Support</h3>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
                We'll use your current conversation history to help our team understand your issue.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
                <div className="space-y-1">
                    <label className="text-xs font-medium">Email Address</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full text-sm p-2 rounded-md border bg-background focus:ring-1 focus:ring-primary"
                        placeholder="you@company.com"
                    />
                </div>

                <div className="space-y-1 flex-1 flex flex-col">
                    <label className="text-xs font-medium">Additional Details</label>
                    <textarea
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full flex-1 text-sm p-2 rounded-md border bg-background resize-none focus:ring-1 focus:ring-primary"
                        placeholder="Please describe what you are trying to achieve..."
                    />
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                    Send Ticket
                </button>
            </form>
        </div>
    );
};
