import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

/** Free-form tag editor: type a tag and press Enter/comma; existing tags are
 * offered as suggestions. Used in the admin artwork form. */
export function TagInput({
  value,
  onChange,
  suggestions,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}) {
  const [input, setInput] = useState("");

  const has = (tag: string) => value.some((t) => t.toLowerCase() === tag.toLowerCase());

  const add = (raw: string) => {
    const tag = raw.trim();
    if (tag && !has(tag)) onChange([...value, tag]);
    setInput("");
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && input === "" && value.length) {
      removeAt(value.length - 1);
    }
  };

  const matches = input.trim()
    ? suggestions.filter((s) => !has(s) && s.toLowerCase().includes(input.trim().toLowerCase()))
    : [];

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-card border border-stone-300 bg-white p-2 focus-within:border-stone-500">
        {value.map((tag, i) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-stone-100 py-1 pl-3 pr-1.5 text-sm text-stone-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="rounded-full p-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-600"
              aria-label={`Remove ${tag}`}
            >
              <X size={13} />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(input)}
          placeholder={value.length ? "" : "Add a technique…"}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-base outline-none"
        />
      </div>
      {matches.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-card border border-stone-200 bg-white py-1 shadow-lg">
          {matches.slice(0, 8).map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(s);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-50"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
