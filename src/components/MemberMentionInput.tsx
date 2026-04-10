import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import type { Membro } from "@/types/ata";

interface Props {
  value: string;
  onChange: (value: string) => void;
  membros: Membro[];
  placeholder?: string;
  className?: string;
}

export function MemberMentionInput({ value, onChange, membros, placeholder, className }: Props) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState<Membro[]>([]);
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    onChange(val);

    // Find @ before cursor
    const before = val.slice(0, cursor);
    const atIdx = before.lastIndexOf("@");
    if (atIdx >= 0 && (atIdx === 0 || before[atIdx - 1] === " ")) {
      const query = before.slice(atIdx + 1).toLowerCase();
      const matches = membros
        .filter(m => m.nome.toLowerCase().includes(query))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      if (matches.length > 0) {
        setFiltered(matches);
        setMentionStart(atIdx);
        setShowSuggestions(true);
        setSelectedIdx(0);
        return;
      }
    }
    setShowSuggestions(false);
  }, [membros, onChange]);

  const selectMember = useCallback((membro: Membro) => {
    const before = value.slice(0, mentionStart);
    const cursor = inputRef.current?.selectionStart ?? value.length;
    const after = value.slice(cursor);
    // Insert with title: "o 1º Dirigente Nome" or "a irmã Nome"
    let ref = '';
    if (membro.cargo) {
      const art = membro.genero === 'feminino' ? 'a' : 'o';
      ref = `${art} ${membro.cargo} ${membro.nome}`;
    } else {
      const titulo = membro.genero === 'feminino' ? 'a irmã' : 'o irmão';
      ref = `${titulo} ${membro.nome}`;
    }
    const newVal = before + ref + after;
    onChange(newVal);
    setShowSuggestions(false);
    setTimeout(() => {
      const pos = before.length + ref.length;
      inputRef.current?.setSelectionRange(pos, pos);
      inputRef.current?.focus();
    }, 0);
  }, [value, mentionStart, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectMember(filtered[selectedIdx]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }, [showSuggestions, filtered, selectedIdx, selectMember]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {showSuggestions && filtered.length > 0 && (
        <div ref={listRef} className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-lg border bg-popover shadow-lg">
          {filtered.map((m, i) => (
            <button
              key={m.nome}
              type="button"
              onMouseDown={() => selectMember(m)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-accent/10 transition-colors ${i === selectedIdx ? "bg-accent/10" : ""}`}
            >
              <span className="font-medium text-foreground">{m.nome}</span>
              {m.cargo && <span className="text-xs text-muted-foreground ml-2">{m.cargo}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
