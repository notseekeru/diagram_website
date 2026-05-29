type PreviewPanelProps = {
  previewSvg: string;
  previewError: string | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
};

export default function PreviewPanel({
  previewSvg,
  previewError,
  isFullscreen,
  onToggleFullscreen,
}: PreviewPanelProps) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-surface/90 p-3 shadow-xl min-h-0 flex-1">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">
          Preview
        </h2>
        <button
          onClick={onToggleFullscreen}
          className="text-xs px-2 py-1 rounded border border-border bg-surface text-slate-300 hover:border-accentSecondary/50 transition focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>

      {/* Embedded with your grid-pattern layout configurations */}
      <div className="flex-1 min-h-0 w-full rounded-xl border border-border bg-surface bg-grid-pattern bg-grid-size p-4 overflow-auto flex items-center justify-center">
        {previewError ? (
          <div className="text-xs font-mono text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 max-w-md w-full">
            <p className="font-semibold mb-1">Render Error:</p>
            {previewError}
          </div>
        ) : previewSvg ? (
          <div
            className="w-full h-full flex items-center justify-center clean-svg-output"
            dangerouslySetInnerHTML={{ __html: previewSvg }}
          />
        ) : (
          <p className="text-xs text-muted font-mono">
            Awaiting valid chart layout...
          </p>
        )}
      </div>
    </section>
  );
}
