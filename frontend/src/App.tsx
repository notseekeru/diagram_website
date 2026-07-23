import axios from "axios";
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import EditorPanel from "./components/EditorPanel";
import PreviewPanel from "./components/PreviewPanel";
import RecentBar from "./components/RecentBar";
import type { DiagramSummary, StatusMessage, StatusTone } from "./types";

type ServerDiagram = {
    id: string;
    title: string;
    mermaid_text: string;
    created_at: string;
    updated_at: string;
};

const AUTO_SAVE_DELAY_MS = 2000;
const DEFAULT_TITLE = "Untitled Diagram";

const defaultMermaid = `flowchart TB
  A[Visitor] --> B{Needs diagram?}
  B -- Yes --> C[Write Mermaid]
  C --> D[Preview]
  D --> E[Save to Postgres]
  B -- No --> F[Close tab]`;

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";

const normalizeTitle = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : DEFAULT_TITLE;
};

const isDraftDirty = (title: string, mermaidText: string) => {
    return title.trim() !== DEFAULT_TITLE || mermaidText.trim() !== defaultMermaid.trim();
};

export default function App() {
    const [apiKey, setApiKey] = useState(() => {
        return localStorage.getItem("diagram_api_key") ?? "";
    });
    const [title, setTitle] = useState(DEFAULT_TITLE);
    const [mermaidText, setMermaidText] = useState(defaultMermaid);
    const [diagrams, setDiagrams] = useState<DiagramSummary[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [status, setStatus] = useState<StatusMessage | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const [isRecentOpen, setIsRecentOpen] = useState(false);
    const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);

    const autoSaveTimer = useRef<number | null>(null);
    const autoSaveInFlight = useRef(false);
    const lastSavedPayload = useRef<string>("");
    const hasApiKey = apiKey.trim().length > 0;
    const draftDirty = useMemo(() => isDraftDirty(title, mermaidText), [title, mermaidText]);

    const api = useMemo(() => {
        return axios.create({
            baseURL: backendUrl,
            headers: hasApiKey ? { "X-API-Key": apiKey.trim() } : {},
        });
    }, [apiKey, hasApiKey]);

    useEffect(() => {
        localStorage.setItem("diagram_api_key", apiKey);
    }, [apiKey]);

    const setStatusMessage = useCallback((tone: StatusTone, message: string) => {
        setStatus({ tone, message });
    }, []);

    useEffect(() => {
        if (!status) return;

        const timer = window.setTimeout(() => {
            setStatus(null);
        }, 4000);

        return () => window.clearTimeout(timer);
    }, [status]);

    const applyServerDiagram = useCallback(
        (diagram: ServerDiagram) => {
            const nextTitle = diagram.title ?? DEFAULT_TITLE;
            const nextText = diagram.mermaid_text ?? mermaidText;
            setSelectedId(diagram.id);
            setTitle(nextTitle);
            setMermaidText(nextText);
            lastSavedPayload.current = JSON.stringify({
                title: nextTitle,
                mermaidText: nextText,
            });
        },
        [mermaidText],
    );

    const fetchDiagrams = useCallback(
        async (silent = false) => {
            if (!hasApiKey) {
                if (!silent) {
                    setStatusMessage("info", "Add your X-API-Key to load diagrams.");
                }
                return;
            }

            if (!silent) setIsBusy(true);
            try {
                const response = await api.get("/api/diagrams?limit=50");
                const summaries = (response.data.diagrams as Array<Record<string, string>>).map((diagram) => ({
                    id: diagram.id,
                    title: diagram.title,
                    createdAt: diagram.created_at,
                    updatedAt: diagram.updated_at,
                }));
                setDiagrams(summaries);
                if (!silent) {
                    setStatusMessage("success", "Diagrams loaded.");
                }
            } catch (error) {
                console.error(error);
                if (!silent) {
                    setStatusMessage("error", "Failed to load diagrams.");
                }
            } finally {
                if (!silent) setIsBusy(false);
            }
        },
        [api, hasApiKey, setStatusMessage],
    );

    const createDiagram = useCallback(
        async (payload: { title: string; mermaidText: string }) => {
            const response = await api.post("/api/save-diagram", payload);
            return response.data.diagram as ServerDiagram;
        },
        [api],
    );

    const updateDiagram = useCallback(
        async (id: string, payload: { title: string; mermaidText: string }, silent: boolean) => {
            if (!silent) setIsBusy(true);
            try {
                const response = await api.put(`/api/diagrams/${id}`, payload);
                return response.data.diagram as ServerDiagram;
            } catch (error) {
                console.error(error);
                if (!silent) {
                    setStatusMessage("error", "Failed to update diagram.");
                }
                throw error;
            } finally {
                if (!silent) setIsBusy(false);
            }
        },
        [api, setStatusMessage],
    );

    const buildPayload = useCallback(() => {
        return {
            title: normalizeTitle(title),
            mermaidText,
        };
    }, [mermaidText, title]);

    const saveDiagram = useCallback(async () => {
        if (!hasApiKey) {
            setStatusMessage("error", "X-API-Key is required to save.");
            return;
        }

        const payload = buildPayload();
        if (!payload.mermaidText.trim()) {
            setStatusMessage("error", "Mermaid text is required.");
            return;
        }

        setIsBusy(true);
        try {
            if (selectedId) {
                const diagram = await updateDiagram(selectedId, payload, true);
                applyServerDiagram(diagram);
                setStatusMessage("success", "Diagram updated.");
            } else {
                const diagram = await createDiagram(payload);
                applyServerDiagram(diagram);
                setStatusMessage("success", "Diagram saved.");
            }
            await fetchDiagrams(true);
        } catch (error) {
            console.error(error);
            setStatusMessage("error", "Failed to save diagram.");
        } finally {
            setIsBusy(false);
        }
    }, [applyServerDiagram, buildPayload, createDiagram, fetchDiagrams, hasApiKey, selectedId, setStatusMessage, updateDiagram]);

    const resetEditor = useCallback(() => {
        setSelectedId(null);
        setTitle(DEFAULT_TITLE);
        setMermaidText(defaultMermaid);
        lastSavedPayload.current = "";
        setLastAutoSave(null);
        setStatusMessage("info", "New draft ready.");
    }, [setStatusMessage]);

    const deleteDiagram = useCallback(async () => {
        if (!hasApiKey || !selectedId) {
            setStatusMessage("error", "Select a diagram to delete.");
            return;
        }

        const confirmDelete = window.confirm("Delete this diagram? This cannot be undone.");
        if (!confirmDelete) return;

        setIsBusy(true);
        try {
            await api.delete(`/api/diagrams/${selectedId}`);
            resetEditor();
            setStatusMessage("success", "Diagram deleted.");
            await fetchDiagrams(true);
        } catch (error) {
            console.error(error);
            setStatusMessage("error", "Failed to delete diagram.");
        } finally {
            setIsBusy(false);
        }
    }, [api, fetchDiagrams, hasApiKey, selectedId, setStatusMessage, resetEditor]);

    const loadDiagram = useCallback(
        async (id: string) => {
            if (!hasApiKey) {
                setStatusMessage("error", "X-API-Key is required to load.");
                return;
            }

            setIsBusy(true);
            try {
                const response = await api.get(`/api/get-diagram/${id}`);
                const diagram = response.data.diagram as ServerDiagram;
                applyServerDiagram(diagram);
                setStatusMessage("success", "Diagram loaded.");
            } catch (error) {
                console.error(error);
                setStatusMessage("error", "Failed to load diagram.");
            } finally {
                setIsBusy(false);
            }
        },
        [api, applyServerDiagram, hasApiKey, setStatusMessage],
    );

    useEffect(() => {
        if (!hasApiKey) {
            return;
        }
        const id = setTimeout(() => {
            fetchDiagrams(true).catch(() => undefined);
        }, 0);
        return () => clearTimeout(id);
    }, [fetchDiagrams, hasApiKey]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const isModifier = event.ctrlKey || event.metaKey;
            if (!isModifier) return;

            const key = event.key.toLowerCase();
            if (key === "s") {
                event.preventDefault();
                saveDiagram();
            }
            if (key === "d") {
                event.preventDefault();
                deleteDiagram();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [deleteDiagram, saveDiagram]);

    useEffect(() => {
        if (!hasApiKey || !mermaidText.trim()) return;
        if (!selectedId && !draftDirty) return;

        const payload = buildPayload();
        const payloadKey = JSON.stringify(payload);
        if (payloadKey === lastSavedPayload.current) return;

        if (autoSaveTimer.current) {
            window.clearTimeout(autoSaveTimer.current);
        }

        autoSaveTimer.current = window.setTimeout(() => {
            if (autoSaveInFlight.current) return;

            autoSaveInFlight.current = true;
            const isCreate = !selectedId;
            const action = selectedId ? updateDiagram(selectedId, payload, true) : createDiagram(payload);

            action
                .then((diagram: ServerDiagram) => {
                    applyServerDiagram(diagram);
                    setLastAutoSave(new Date().toLocaleTimeString());
                    if (isCreate) {
                        fetchDiagrams(true).catch(() => undefined);
                    }
                })
                .catch(() => {
                    setStatusMessage("error", "Autosave failed.");
                })
                .finally(() => {
                    autoSaveInFlight.current = false;
                });
        }, AUTO_SAVE_DELAY_MS);

        return () => {
            if (autoSaveTimer.current) {
                window.clearTimeout(autoSaveTimer.current);
            }
        };
    }, [applyServerDiagram, buildPayload, createDiagram, draftDirty, fetchDiagrams, hasApiKey, mermaidText, selectedId, setStatusMessage, updateDiagram]);

    const layoutClass = isRecentOpen ? "grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]" : "grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]";

    const handleApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
        setApiKey(event.target.value);
    };

    const toggleRecent = () => {
        setIsRecentOpen((value: boolean) => !value);
    };

    return (
        <div className="min-h-screen text-slate-100 bg-surface">
            <div className="flex h-screen flex-col px-5 pb-6 pt-6 lg:px-10">
                <div className={`grid flex-1 min-h-0 gap-4 ${layoutClass}`}>
                    {isRecentOpen && (
                        <div className="hidden lg:block min-h-0">
                            <RecentBar diagrams={diagrams} selectedId={selectedId} onSelect={loadDiagram} />
                        </div>
                    )}

                    <EditorPanel
                        apiKey={apiKey}
                        onApiKeyChange={handleApiKeyChange}
                        title={title}
                        mermaidText={mermaidText}
                        onTitleChange={setTitle}
                        onMermaidChange={setMermaidText}
                        onSave={saveDiagram}
                        onDelete={deleteDiagram}
                        onNew={resetEditor}
                        onRefresh={() => fetchDiagrams(false)}
                        onToggleRecent={toggleRecent}
                        isBusy={isBusy}
                        hasApiKey={hasApiKey}
                        isRecentOpen={isRecentOpen}
                        selectedId={selectedId}
                        lastAutoSave={lastAutoSave}
                        status={status}
                    />

                    <PreviewPanel id="editor-preview" chart={mermaidText} label="" title="" description="" />
                </div>
            </div>

            {isRecentOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 lg:hidden" onClick={() => setIsRecentOpen(false)} onKeyDown={(e) => { if (e.key === 'Escape') setIsRecentOpen(false); }} role="presentation">
                    <div className="flex flex-col w-full max-w-md max-h-[80vh] rounded-xl border border-border bg-surface/90 shadow-2xl" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { e.stopPropagation(); }} role="dialog" aria-modal="true" aria-label="Recent diagrams">
                        <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
                            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">Recent</h2>
                            <span className="text-xs text-muted">{diagrams.length}</span>
                            <button type="button" onClick={() => setIsRecentOpen(false)} className="ml-auto pl-4 text-muted hover:text-slate-100 text-sm">
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-auto p-3 space-y-2">
                            {diagrams.length === 0 ? (
                                <p className="text-xs text-muted">No diagrams yet.</p>
                            ) : (
                                diagrams.map((diagram) => (
                                    <button
                                        type="button"
                                        key={diagram.id}
                                        onClick={() => {
                                            loadDiagram(diagram.id);
                                            setIsRecentOpen(false);
                                        }}
                                        className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${diagram.id === selectedId ? "border-accent/60 bg-accent/10" : "border-border bg-surface/70 hover:border-accent/40"}`}
                                    >
                                        <div className="truncate font-medium text-slate-100">{diagram.title}</div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
