import React from "react";
import type { Suggestion } from "./types";

interface SuggestedQuestionsProps {
  suggestions: Suggestion[];
  onSelect: (text: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  suggestions,
  onSelect
}) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-auto flex flex-col gap-2 pb-4">
      <p className="text-muted-foreground ml-1 text-xs">Suggested questions:</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.text)}
            className="bg-muted/80 hover:bg-muted text-foreground hover:border-primary/20 rounded-full border border-transparent px-3 py-2 text-left text-xs transition-colors"
          >
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
};
