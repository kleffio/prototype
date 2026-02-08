import React from 'react';
import type { Suggestion } from './types';

interface SuggestedQuestionsProps {
    suggestions: Suggestion[];
    onSelect: (text: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ suggestions, onSelect }) => {
    if (suggestions.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 mt-auto pb-4">
            <p className="text-xs text-muted-foreground ml-1">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => onSelect(s.text)}
                        className="text-xs bg-muted/80 hover:bg-muted text-foreground px-3 py-2 rounded-full transition-colors text-left border border-transparent hover:border-primary/20"
                    >
                        {s.text}
                    </button>
                ))}
            </div>
        </div>
    );
};
