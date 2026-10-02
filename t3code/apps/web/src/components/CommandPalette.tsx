import { useMemo, useState } from "react";

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

interface FuzzyMatch {
  command: Command;
  score: number;
  highlights: number[]; // indices of matching characters in label
}

/**
 * Fuzzy-match `query` against `text`.
 * Returns a score (higher = better match) and the indices of matched characters,
 * or null if the query cannot be matched.
 */
function fuzzyMatch(text: string, query: string): { score: number; highlights: number[] } | null {
  if (!query) return { score: 0, highlights: [] };
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const highlights: number[] = [];
  let qi = 0;
  let score = 0;
  let lastMatch = -1;

  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) {
      highlights.push(i);
      // Consecutive matches and start-of-word matches score higher
      const consecutive = lastMatch === i - 1 ? 5 : 0;
      const wordStart = i === 0 || lower[i - 1] === " " ? 3 : 0;
      score += 1 + consecutive + wordStart;
      lastMatch = i;
      qi++;
    }
  }

  // All query characters must be matched
  if (qi < q.length) return null;
  return { score, highlights };
}

/**
 * Highlight a label string given the character indices that matched the query.
 * Returns an array of { text, highlighted } segments.
 */
function buildSegments(label: string, highlights: number[]) {
  const highlightSet = new Set(highlights);
  const segments: { text: string; highlighted: boolean }[] = [];
  let current = { text: "", highlighted: false };

  for (let i = 0; i < label.length; i++) {
    const h = highlightSet.has(i);
    if (h !== current.highlighted && current.text) {
      segments.push(current);
      current = { text: "", highlighted: h };
    }
    current.highlighted = h;
    current.text += label[i];
  }
  if (current.text) segments.push(current);
  return segments;
}

interface Props {
  commands: Command[];
  onClose: () => void;
}

export function CommandPalette({ commands, onClose }: Props) {
  const [query, setQuery] = useState("");

  const results = useMemo<FuzzyMatch[]>(() => {
    if (!query.trim()) {
      return commands.map((c) => ({ command: c, score: 0, highlights: [] }));
    }
    return commands
      .map((c) => {
        const m = fuzzyMatch(c.label, query);
        return m ? { command: c, score: m.score, highlights: m.highlights } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score) as FuzzyMatch[];
  }, [commands, query]);

  return (
    <div role="dialog" aria-label="Command Palette" className="command-palette">
      <input
        autoFocus
        type="text"
        placeholder="Search commands…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search commands"
        className="command-palette__input"
      />
      <ul role="listbox" className="command-palette__list">
        {results.map(({ command, highlights }) => {
          const segments = buildSegments(command.label, highlights);
          return (
            <li key={command.id} role="option" onClick={() => { command.action(); onClose(); }}>
              <span>
                {segments.map((seg, i) =>
                  seg.highlighted ? (
                    <mark key={i} className="command-palette__highlight">{seg.text}</mark>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  )
                )}
              </span>
              {command.shortcut && <kbd>{command.shortcut}</kbd>}
            </li>
          );
        })}
        {results.length === 0 && <li className="command-palette__empty">No commands found</li>}
      </ul>
    </div>
  );
}
