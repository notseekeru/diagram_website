import { useEffect, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";
import axios from "axios";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

type DiagramSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type StatusTone = "info" | "success" | "error";

type StatusMessage = {
  tone: StatusTone;
  message: string;
};

const AUTO_SAVE_DELAY_MS = 2000;
const AUTO_CONFIG_BLOCK = ["---", "config:", "  layout: elk", "---", ""].join(
  "\n",
);

const defaultMermaid = `flowchart TB
  A[Visitor] --> B{Needs diagram?}
  B -- Yes --> C[Write Mermaid]
  C --> D[Preview]
  D --> E[Save to Postgres]
  B -- No --> F[Close tab]`;

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5000";

const normalizeTitle = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Untitled Diagram";
};

const ensureAutoConfig = (value: string) => {
  if (!value.trim()) {
    return value;
  }

  const lines = value.split("\n");
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentIndex === -1) {
    return value;
  }

  if (lines[firstContentIndex].trim() === "---") {
    const endIndex = lines.findIndex(
      (line, index) => index > firstContentIndex && line.trim() === "---",
    );
    if (endIndex > firstContentIndex) {
      const hasConfig = lines
        .slice(firstContentIndex + 1, endIndex)
        .some((line) => line.trim().startsWith("config:"));
      if (hasConfig) {
        return value;
      }

      const updatedLines = [...lines];
      updatedLines.splice(endIndex, 0, "config:", "  layout: elk");
      return updatedLines.join("\n");
    }
  }

  return `${AUTO_CONFIG_BLOCK}${value}`;
};

export default function App() {
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("diagram_api_key") ?? "";
  });
  const [title, setTitle] = useState("Untitled Diagram");
  const [mermaidText, setMermaidText] = useState(defaultMermaid);
  const [diagrams, setDiagrams] = useState<DiagramSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewSvg, setPreviewSvg] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);

  const autoSaveTimer = useRef<number | null>(null);
  const autoSaveInFlight = useRef(false);
  const lastSavedPayload = useRef<string>("");

  const hasApiKey = apiKey.trim().length > 0;
  const previewSource = useMemo(
    () => ensureAutoConfig(mermaidText),
    [mermaidText],
  );

  const api = useMemo(() => {
    return axios.create({
      baseURL: backendUrl,
      headers: hasApiKey ? { "X-API-Key": apiKey.trim() } : {},
    });
  }, [apiKey, hasApiKey]);

  useEffect(() => {
    localStorage.setItem("diagram_api_key", apiKey);
  }, [apiKey]);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      fontFamily: "Space Grotesk, sans-serif",
      themeVariables: {
        background: "#0b121a",
        primaryColor: "#111821",
        primaryBorderColor: "#2a3442",
        primaryTextColor: "#e2ebf5",
        lineColor: "#8dd3ff",
        secondaryColor: "#0b121a",
        tertiaryColor: "#0b121a",
      },
    });
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      mermaid
        .render(`preview-${Date.now()}`, previewSource)
        .then((result: { svg: string }) => {
          setPreviewSvg(result.svg);
          setPreviewError(null);
        })
        .catch((error: Error) => {
          setPreviewSvg("");
          setPreviewError(error.message);
        });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [previewSource]);

  useEffect(() => {
    if (!hasApiKey) {
      setDiagrams([]);
      return;
    }

    fetchDiagrams().catch(() => undefined);
  }, [hasApiKey]);

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!hasApiKey || !selectedId) {
      return;
    }

    if (!mermaidText.trim()) {
      return;
    }

    const payload = {
      title: normalizeTitle(title),
      mermaidText: ensureAutoConfig(mermaidText),
    };
    const payloadKey = JSON.stringify(payload);
    if (payloadKey === lastSavedPayload.current) {
      return;
    }

    if (autoSaveTimer.current) {
      window.clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = window.setTimeout(() => {
      if (autoSaveInFlight.current) {
        return;
      }

      autoSaveInFlight.current = true;
      updateDiagram(selectedId, payload, true)
        .then(() => {
          lastSavedPayload.current = payloadKey;
          setLastAutoSave(new Date().toLocaleTimeString());
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
  }, [hasApiKey, mermaidText, selectedId, title]);

  const setStatusMessage = (tone: StatusTone, message: string) => {
    setStatus({ tone, message });
  };

  const buildPayload = () => {
    const payload = {
      title: normalizeTitle(title),
      mermaidText: ensureAutoConfig(mermaidText),
    };
    return payload;
  };

  const fetchDiagrams = async () => {
    if (!hasApiKey) {
      setStatusMessage("info", "Add your X-API-Key to load diagrams.");
      return;
    }

    setIsBusy(true);
    try {
      const response = await api.get("/api/diagrams?limit=50");
      const summaries = (
        response.data.diagrams as Array<Record<string, string>>
      ).map((diagram) => ({
        id: diagram.id,
        title: diagram.title,
        createdAt: diagram.created_at,
        updatedAt: diagram.updated_at,
      }));
      setDiagrams(summaries);
      setStatusMessage("success", "Diagrams loaded.");
    } catch (error) {
      console.error(error);
      setStatusMessage("error", "Failed to load diagrams.");
    } finally {
      setIsBusy(false);
    }
  };

  const createDiagram = async (payload: {
    title: string;
    mermaidText: string;
  }) => {
    const response = await api.post("/api/save-diagram", payload);
    return response.data.diagram as Record<string, string>;
  };

  const updateDiagram = async (
    id: string,
    payload: { title: string; mermaidText: string },
    silent: boolean,
  ) => {
    if (!silent) {
      setIsBusy(true);
    }
    try {
      const response = await api.put(`/api/diagrams/${id}`, payload);
      if (!silent) {
        setStatusMessage("success", "Diagram updated.");
      }
      return response.data.diagram as Record<string, string>;
    } catch (error) {
      console.error(error);
      if (!silent) {
        setStatusMessage("error", "Failed to update diagram.");
      }
      throw error;
    } finally {
      if (!silent) {
        setIsBusy(false);
      }
    }
  };

  const saveDiagram = async () => {
    if (!hasApiKey) {
      setStatusMessage("error", "X-API-Key is required to save.");
      return;
    }

    const payload = buildPayload();
    if (!payload.mermaidText.trim()) {
      setStatusMessage("error", "Mermaid text is required.");
      return;
    }

    if (payload.mermaidText !== mermaidText) {
      setMermaidText(payload.mermaidText);
    }

    setIsBusy(true);
    try {
      if (selectedId) {
        const diagram = await updateDiagram(selectedId, payload, true);
        setSelectedId(diagram.id);
        setStatusMessage("success", "Diagram updated.");
        lastSavedPayload.current = JSON.stringify(payload);
      } else {
        const diagram = await createDiagram(payload);
        setSelectedId(diagram.id);
        setStatusMessage("success", "Diagram saved.");
        lastSavedPayload.current = JSON.stringify(payload);
      }
      await fetchDiagrams();
    } catch (error) {
      console.error(error);
      setStatusMessage("error", "Failed to save diagram.");
    } finally {
      setIsBusy(false);
    }
  };

  const loadDiagram = async (id: string) => {
    if (!hasApiKey) {
      setStatusMessage("error", "X-API-Key is required to load.");
      return;
    }

    setIsBusy(true);
    try {
      const response = await api.get(`/api/get-diagram/${id}`);
      const diagram = response.data.diagram as Record<string, string>;
      setSelectedId(diagram.id);
      setTitle(diagram.title);
      setMermaidText(diagram.mermaid_text);
      lastSavedPayload.current = JSON.stringify({
        title: diagram.title,
        mermaidText: diagram.mermaid_text,
      });
      setStatusMessage("success", "Diagram loaded.");
    } catch (error) {
      console.error(error);
      setStatusMessage("error", "Failed to load diagram.");
    } finally {
      setIsBusy(false);
    }
  };

  const deleteDiagram = async () => {
    if (!hasApiKey || !selectedId) {
      setStatusMessage("error", "Select a diagram to delete.");
      return;
    }

    const confirmDelete = window.confirm(
      "Delete this diagram? This cannot be undone.",
    );
    if (!confirmDelete) {
      return;
    }

    setIsBusy(true);
    try {
      await api.delete(`/api/diagrams/${selectedId}`);
      resetEditor();
      setStatusMessage("success", "Diagram deleted.");
      await fetchDiagrams();
    } catch (error) {
      console.error(error);
      setStatusMessage("error", "Failed to delete diagram.");
    } finally {
      setIsBusy(false);
    }
  };

  const resetEditor = () => {
    setSelectedId(null);
    setTitle("Untitled Diagram");
    setMermaidText(defaultMermaid);
    lastSavedPayload.current = "";
    setLastAutoSave(null);
    setStatusMessage("info", "Editor reset.");
  };

  const statusStyles: Record<StatusTone, string> = {
    info: "border-border bg-surface/70 text-slate-200",
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    error: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  };

  const PreviewPanel = ({ fullscreen }: { fullscreen: boolean }) => {
    return (
      <section
        className={`border-gradient rounded-2xl bg-surface/90 p-5 shadow-sm ${
          fullscreen ? "h-full" : ""
        }`}
      >
        <TransformWrapper
          minScale={0.5}
          maxScale={3}
          centerOnInit
          wheel={{ step: 0.08 }}
          doubleClick={{ disabled: true }}
        >
          {({
            zoomIn,
            zoomOut,
            resetTransform,
          }: {
            zoomIn: () => void;
            zoomOut: () => void;
            resetTransform: () => void;
          }) => (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">
                    Preview
                  </h2>
                  <p className="text-xs text-muted">
                    Pan to move, scroll to zoom.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => zoomOut()}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-slate-100 transition hover:border-accent/60"
                  >
                    -
                  </button>
                  <button
                    onClick={() => zoomIn()}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-slate-100 transition hover:border-accent/60"
                  >
                    +
                  </button>
                  <button
                    onClick={() => resetTransform()}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-slate-100 transition hover:border-accent/60"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setIsFullscreen(!fullscreen)}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-slate-100 transition hover:border-accent/60"
                  >
                    {fullscreen ? "Exit" : "Full"}
                  </button>
                </div>
              </div>
              <div
                className={`mt-4 rounded-2xl border border-border bg-[#0b121a]/70 p-4 ${
                  fullscreen ? "h-[calc(100%-60px)]" : "min-h-[420px]"
                }`}
              >
                {previewError ? (
                  <div className="text-sm text-rose-200">{previewError}</div>
                ) : (
                  <TransformComponent
                    wrapperClass="h-full w-full"
                    contentClass="flex h-full w-full items-center justify-center"
                  >
                    <div
                      className="mermaid max-w-full overflow-auto"
                      dangerouslySetInnerHTML={{ __html: previewSvg }}
                    />
                  </TransformComponent>
                )}
              </div>
              <div className="mt-3 text-xs text-muted">
                Auto config applied (layout: elk). Autosave updates selected
                diagrams.
              </div>
            </>
          )}
        </TransformWrapper>
      </section>
    );
  };

  return (
    <div className="min-h-screen text-slate-100">
      <div className="px-6 pb-12 pt-10 lg:px-12">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted">
              Diagram Vault
            </p>
            <h1 className="text-3xl font-semibold text-slate-100">
              Mermaid Workspace
            </h1>
            <p className="text-sm text-muted">
              Minimal storage editor with icy blue focus.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[360px]">
            <label className="text-xs uppercase tracking-[0.2em] text-muted">
              X-API-Key
            </label>
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="paste your api key"
              className="w-full rounded-xl border border-border bg-surface/70 px-4 py-2 text-sm text-slate-100 placeholder:text-muted shadow-sm outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={saveDiagram}
            disabled={isBusy || !hasApiKey}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-900 transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save
          </button>
          <button
            onClick={deleteDiagram}
            disabled={isBusy || !selectedId}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/70 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete
          </button>
          <button
            onClick={fetchDiagrams}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/70 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
          <button
            onClick={resetEditor}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-transparent px-4 py-2 text-sm font-semibold text-muted transition hover:border-accent/40 hover:text-slate-100"
          >
            New
          </button>
          {selectedId && (
            <div className="text-xs text-muted">Selected: {selectedId}</div>
          )}
          {lastAutoSave && (
            <div className="text-xs text-muted">
              Autosaved at {lastAutoSave}
            </div>
          )}
        </div>

        {status && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${statusStyles[status.tone]}`}
          >
            {status.message}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
          <aside className="border-gradient rounded-2xl bg-surface/90 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">Recent</h2>
              <span className="text-xs text-muted">{diagrams.length}</span>
            </div>
            <div className="mt-4 space-y-2">
              {diagrams.length === 0 ? (
                <p className="text-sm text-muted">No diagrams yet.</p>
              ) : (
                diagrams.map((diagram) => (
                  <button
                    key={diagram.id}
                    onClick={() => loadDiagram(diagram.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                      diagram.id === selectedId
                        ? "border-accent/60 bg-accent/10"
                        : "border-border bg-surface/70 hover:border-accent/40"
                    }`}
                  >
                    <div className="truncate font-medium text-slate-100">
                      {diagram.title}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="border-gradient rounded-2xl bg-surface/90 p-5">
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-muted">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-muted">
                  Mermaid source
                </label>
                <textarea
                  value={mermaidText}
                  onChange={(event) => setMermaidText(event.target.value)}
                  className="mt-2 min-h-[420px] w-full resize-none rounded-2xl border border-border bg-surface/70 p-4 font-mono text-sm text-slate-100 outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>
          </section>

          {isFullscreen ? null : <PreviewPanel fullscreen={false} />}
        </div>
      </div>

      {isFullscreen && (
        <>
          <div className="fixed inset-0 z-40 bg-[#0b121a]/95" />
          <div className="fixed inset-6 z-50">
            <PreviewPanel fullscreen />
          </div>
        </>
      )}
    </div>
  );
}
