import { type ChangeEvent, type UIEvent, useCallback, useMemo, useRef } from "react";
import { FiList, FiPlus, FiRefreshCw, FiSave, FiTrash2 } from "react-icons/fi";
import type { StatusMessage, StatusTone } from "../types";

type EditorPanelProps = {
    apiKey: string;
    onApiKeyChange: (event: ChangeEvent<HTMLInputElement>) => void;
    title: string;
    mermaidText: string;
    onTitleChange: (value: string) => void;
    onMermaidChange: (value: string) => void;
    onSave: () => void;
    onDelete: () => void;
    onNew: () => void;
    onRefresh: () => void;
    onToggleRecent: () => void;
    isBusy: boolean;
    hasApiKey: boolean;
    isRecentOpen: boolean;
    selectedId: string | null;
    lastAutoSave: string | null;
    status: StatusMessage | null;
};

const statusStyles: Record<StatusTone, string> = {
    info: "border-border bg-surface/70 text-slate-200",
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    error: "border-rose-500/40 bg-rose-500/10 text-rose-200",
};

export default function EditorPanel({ apiKey, onApiKeyChange, title, mermaidText, onTitleChange, onMermaidChange, onSave, onDelete, onNew, onRefresh, onToggleRecent, isBusy, hasApiKey, isRecentOpen, selectedId, lastAutoSave, status }: EditorPanelProps) {
    const handleTitleChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            onTitleChange(event.target.value);
        },
        [onTitleChange],
    );

    const handleMermaidChange = useCallback(
        (event: ChangeEvent<HTMLTextAreaElement>) => {
            onMermaidChange(event.target.value);
        },
        [onMermaidChange],
    );

    const gutterRef = useRef<HTMLPreElement | null>(null);

    // Line numbers gutter must mirror the editable rows 1:1. The textarea line-count
    // matches the number of "hard" rows only when lines don't soft-wrap, so the
    // code box uses wrap="off": every source line is its own row and the textarea
    const lineNumbers = useMemo(() => {
        const count = Math.max(1, mermaidText.split("\n").length);
        return Array.from({ length: count }, (_, i) => String(i + 1)).join("\n");
    }, [mermaidText]);

    const syncGutterScroll = useCallback((event: UIEvent<HTMLTextAreaElement>) => {
        if (gutterRef.current) {
            gutterRef.current.scrollTop = event.currentTarget.scrollTop;
        }
    }, []);

    const actionButtonBase = "inline-flex h-8 w-8 items-center justify-center rounded-lg border text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50";
    const actionButtonIdle = "border-border bg-surface/70 hover:border-accentSecondary/50";
    const actionButtonActive = "border-accent/60 bg-accent/10 text-accent";

    const statusClass = status ? statusStyles[status.tone] : "";

    return (
        <section className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-surface/90 p-3 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <div>
                        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">Editor</h2>
                        <p className="text-[10px] text-muted">Ctrl+S save. Ctrl+D delete.</p>
                    </div>
                    {lastAutoSave && <span className="text-[11px] text-muted">Autosaved at {lastAutoSave}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={onSave} disabled={isBusy || !hasApiKey} title="Save (Ctrl+S)" aria-label="Save (Ctrl+S)" className={`${actionButtonBase} ${actionButtonIdle}`}>
                        <FiSave className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={onToggleRecent} title={isRecentOpen ? "Hide recent" : "Show recent"} aria-label={isRecentOpen ? "Hide recent" : "Show recent"} aria-pressed={isRecentOpen} className={`${actionButtonBase} ${isRecentOpen ? actionButtonActive : actionButtonIdle}`}>
                        <FiList className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={onRefresh} disabled={isBusy} title="Refresh list" aria-label="Refresh list" className={`${actionButtonBase} ${actionButtonIdle}`}>
                        <FiRefreshCw className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={onNew} title="New draft" aria-label="New draft" className={`${actionButtonBase} ${actionButtonIdle}`}>
                        <FiPlus className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={onDelete} disabled={isBusy || !selectedId} title="Delete (Ctrl+D)" aria-label="Delete (Ctrl+D)" className={`${actionButtonBase} ${actionButtonIdle}`}>
                        <FiTrash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {(selectedId || status) && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                    {selectedId && <span className="font-mono bg-surface border border-border px-1.5 py-0.5 rounded text-slate-300 text-[11px]">ID: {selectedId.slice(0, 8)}...</span>}
                    {status && <span className={`rounded-full border px-2 py-0.5 text-xs transition-all ${statusClass}`}>{status.message}</span>}
                </div>
            )}

            <div className="mt-2 flex min-h-0 flex-1 flex-col gap-3">
                <div className="flex flex-col">
                    <label className="text-[11px] uppercase tracking-[0.2em] text-muted">
                        X-API-Key
                        <input
                            type="password"
                            value={apiKey}
                            onChange={onApiKeyChange}
                            placeholder="paste your api key"
                            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-slate-100 placeholder:text-muted shadow-sm outline-none transition focus:border-accentSecondary/60 focus:ring-2 focus:ring-accent/10"
                        />
                    </label>
                </div>

                <div className="flex flex-col">
                    <label className="text-[11px] uppercase tracking-[0.2em] text-muted">
                        Title
                        <input type="text" value={title} onChange={handleTitleChange} className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/30" />
                    </label>
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                    <label className="flex flex-col flex-1 min-h-0 text-[11px] uppercase tracking-[0.2em] text-muted">
                        Mermaid source
                        <span className="mt-1.5 flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface/70 transition focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/30">
                            <pre
                                ref={gutterRef}
                                aria-hidden="true"
                                className="w-12 shrink-0 select-none overflow-hidden py-3 pr-2 text-right font-mono text-xs leading-6 text-muted"
                            >
                                {lineNumbers}
                            </pre>
                            <textarea
                                value={mermaidText}
                                onChange={handleMermaidChange}
                                onScroll={syncGutterScroll}
                                wrap="off"
                                spellCheck={false}
                                className="min-h-0 min-w-0 flex-1 resize-none overflow-auto bg-transparent p-3 pl-2 text-xs leading-6 font-mono text-slate-100 outline-none placeholder:text-muted"
                                placeholder="Type your flowchart/sequence code here..."
                                aria-label="Mermaid source"
                            />
                        </span>
                    </label>
                </div>
            </div>
        </section>
    );
}
