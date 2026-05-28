import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

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
    <section
      className={`border-gradient rounded-xl bg-surface/90 p-3 shadow-sm ${
        isFullscreen ? "h-full" : ""
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100">
                  Preview
                </h2>
                <p className="text-xs text-muted">Pan + zoom enabled.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => zoomOut()}
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-zinc-100 transition hover:border-accent/60"
                >
                  -
                </button>
                <button
                  onClick={() => zoomIn()}
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-zinc-100 transition hover:border-accent/60"
                >
                  +
                </button>
                <button
                  onClick={() => resetTransform()}
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-zinc-100 transition hover:border-accent/60"
                >
                  Reset
                </button>
                <button
                  onClick={onToggleFullscreen}
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-zinc-100 transition hover:border-accent/60"
                >
                  {isFullscreen ? "Exit" : "Full"}
                </button>
              </div>
            </div>
            <div
              className={`preview-grid mt-3 rounded-xl border border-border bg-surface/70 p-3 ${
                isFullscreen ? "h-[calc(100%-56px)]" : "min-h-[340px]"
              }`}
            >
              {previewError ? (
                <div className="text-xs text-rose-400">{previewError}</div>
              ) : (
                <TransformComponent
                  wrapperClass="h-full w-full"
                  contentClass="flex h-full w-full items-center justify-center"
                >
                  <div
                    className="mermaid max-w-full overflow-auto invert dark:invert-0"
                    dangerouslySetInnerHTML={{ __html: previewSvg }}
                  />
                </TransformComponent>
              )}
            </div>
          </>
        )}
      </TransformWrapper>
    </section>
  );
}
