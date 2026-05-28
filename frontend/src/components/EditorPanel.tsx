import type { ChangeEvent } from "react";

type EditorPanelProps = {
  title: string;
  mermaidText: string;
  onTitleChange: (value: string) => void;
  onMermaidChange: (value: string) => void;
};

export default function EditorPanel({
  title,
  mermaidText,
  onTitleChange,
  onMermaidChange,
}: EditorPanelProps) {
  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onTitleChange(event.target.value);
  };

  const handleMermaidChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onMermaidChange(event.target.value);
  };

  return (
    <section className="border-gradient rounded-xl bg-surface/90 p-3">
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-muted">
            Title
          </label>
          <input
            value={title}
            onChange={handleTitleChange}
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-muted">
            Mermaid source
          </label>
          <textarea
            value={mermaidText}
            onChange={handleMermaidChange}
            className="mt-1.5 min-h-[340px] w-full resize-none rounded-xl border border-border bg-surface/70 p-3 font-mono text-xs text-slate-100 outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>
    </section>
  );
}
