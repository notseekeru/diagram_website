import type { DiagramSummary } from "../types";

type RecentBarProps = {
    diagrams: DiagramSummary[];
    selectedId: string | null;
    onSelect: (id: string) => void;
};

export default function RecentBar({ diagrams, selectedId, onSelect }: RecentBarProps) {
    return (
        <aside className="border-gradient flex h-full min-h-0 flex-col rounded-xl bg-surface/90 p-3">
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">Recent</h2>
                <span className="text-xs text-muted">{diagrams.length}</span>
            </div>
            <div className="mt-3 min-h-0 space-y-2 overflow-auto pr-1">
                {diagrams.length === 0 ? (
                    <p className="text-xs text-muted">No diagrams yet.</p>
                ) : (
                    diagrams.map((diagram) => (
                        <button type="button" key={diagram.id} onClick={() => onSelect(diagram.id)} className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${diagram.id === selectedId ? "border-accent/60 bg-accent/10" : "border-border bg-surface/70 hover:border-accent/40"}`}>
                            <div className="truncate font-medium text-slate-100">{diagram.title}</div>
                        </button>
                    ))
                )}
            </div>
        </aside>
    );
}
