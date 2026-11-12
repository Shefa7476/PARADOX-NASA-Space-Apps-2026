// Safe, tiny Markdown renderer for AI answers. It builds React elements
// (never innerHTML), so model output cannot inject HTML or scripts.
// Supports paragraphs, "- " bullets, "1." lists, **bold**, *italic*, `code`,
// powers like 10^8 or x^2, H_2O-style subscripts, and [1] citation chips.
import { Fragment } from "react";

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[\d+\]|\b[A-Za-z0-9.]+\^-?[0-9]+\b|\b[A-Z][a-z]?_[0-9]+\b)/g;

function inline(text, onCite, keyBase) {
  const parts = String(text).split(INLINE);
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (!part) return null;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*].*\*$/.test(part)) return <em key={key}>{part.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(part)) return <code key={key}>{part.slice(1, -1)}</code>;
    if (/^\[\d+\]$/.test(part)) {
      const n = Number(part.slice(1, -1));
      return <button key={key} type="button" className="md-cite" onClick={() => onCite?.(n)} aria-label={`Source ${n}`}>{n}</button>;
    }
    const pow = part.match(/^([A-Za-z0-9.]+)\^(-?[0-9]+)$/);
    if (pow) return <Fragment key={key}>{pow[1]}<sup>{pow[2]}</sup></Fragment>;
    const sub = part.match(/^([A-Z][a-z]?)_([0-9]+)$/);
    if (sub) return <Fragment key={key}>{sub[1]}<sub>{sub[2]}</sub></Fragment>;
    return <Fragment key={key}>{part}</Fragment>;
  });
}

export default function MarkdownText({ text, onCite, lang }) {
  const blocks = [];
  let list = null;
  String(text || "").replace(/\r/g, "").split("\n").forEach((raw) => {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)/);
    const numbered = line.match(/^(\d+)[.)]\s+(.*)/);
    if (bullet || numbered) {
      const type = bullet ? "ul" : "ol";
      if (!list || list.type !== type) { list = { type, items: [] }; blocks.push(list); }
      list.items.push(bullet ? bullet[1] : numbered[2]);
      return;
    }
    list = null;
    if (!line) { blocks.push({ type: "gap" }); return; }
    const heading = line.match(/^#{1,4}\s+(.*)/);
    if (heading) { blocks.push({ type: "h", text: heading[1] }); return; }
    const last = blocks[blocks.length - 1];
    if (last && last.type === "p") last.text += ` ${line}`;
    else blocks.push({ type: "p", text: line });
  });
  return (
    <div className="md" lang={lang}>
      {blocks.map((b, i) => {
        if (b.type === "ul") return <ul key={i}>{b.items.map((it, j) => <li key={j}>{inline(it, onCite, `${i}-${j}`)}</li>)}</ul>;
        if (b.type === "ol") return <ol key={i}>{b.items.map((it, j) => <li key={j}>{inline(it, onCite, `${i}-${j}`)}</li>)}</ol>;
        if (b.type === "h") return <p key={i} className="md-h">{inline(b.text, onCite, `${i}`)}</p>;
        if (b.type === "p") return <p key={i}>{inline(b.text, onCite, `${i}`)}</p>;
        return null;
      })}
    </div>
  );
}
