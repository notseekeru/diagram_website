import { type ChangeEvent, useCallback } from "react";
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
                    {selectedId && <span className="font-mono bg-surface border border-border px-1.5 py-0.5 rounded text-slate-300 text-[11px]">ID: {selectedId.slice(0, 8)}...</span>}
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

            {status && (
                <div className="mt-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs transition-all ${statusClass}`}>{status.message}</span>
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
                        <textarea
                            value={mermaidText}
                            onChange={handleMermaidChange}
                            className="mt-1.5 w-full flex-1 min-h-0 resize-none rounded-xl border border-border bg-surface/70 p-3 font-mono text-xs text-slate-100 outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/30"
                            placeholder="Type your flowchart/sequence code here..."
                        />
                    </label>
                </div>
            </div>
        </section>
    );
}
