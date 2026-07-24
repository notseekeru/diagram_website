import elkLayouts from "@mermaid-js/layout-elk";
import mermaid from "mermaid";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

mermaid.registerLayoutLoaders(elkLayouts);

const PAN_STEP = 80;

function PanControls({ transformRef }: { transformRef: React.RefObject<ReactZoomPanPinchRef | null> }) {
    const pan = useCallback(
        (dx: number, dy: number) => {
            const ctx = transformRef.current;
            if (!ctx) return;
            const { positionX, positionY, scale } = ctx.state;
            ctx.setTransform(positionX + dx, positionY + dy, scale, 150);
        },
        [transformRef],
    );

    const btn = "flex items-center justify-center w-7 h-7 rounded-md bg-zinc-900/80 border border-zinc-700/60 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-500 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 select-none";

    return (
        <div className="absolute bottom-3 right-3 z-20 grid grid-cols-3 gap-0.5">
            {/* row 1: zoom in | up | zoom out */}
            <button type="button" className={btn} onClick={() => transformRef.current?.zoomIn(0.5, 200)} aria-label="Zoom in" tabIndex={-1}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <title>Zoom in</title>
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
                </svg>
            </button>
            <button type="button" className={btn} onClick={() => pan(0, PAN_STEP)} aria-label="Pan up" tabIndex={-1}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <title>Pan up</title>
                    <path d="m18 15-6-6-6 6" />
                </svg>
            </button>
            <button type="button" className={btn} onClick={() => transformRef.current?.zoomOut(0.5, 200)} aria-label="Zoom out" tabIndex={-1}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <title>Zoom out</title>
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35M8 11h6" />
                </svg>
            </button>
            {/* row 2: left | reset | right */}
            <button type="button" className={btn} onClick={() => pan(PAN_STEP, 0)} aria-label="Pan left" tabIndex={-1}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <title>Pan left</title>
                    <path d="m15 18-6-6 6-6" />
                </svg>
            </button>
            <button type="button" className={`${btn} bg-zinc-900/90`} onClick={() => transformRef.current?.centerView(1, 200)} aria-label="Reset view" tabIndex={-1}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <title>Reset view</title>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
                </svg>
            </button>
            <button type="button" className={btn} onClick={() => pan(-PAN_STEP, 0)} aria-label="Pan right" tabIndex={-1}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <title>Pan right</title>
                    <path d="m9 18 6-6-6-6" />
                </svg>
            </button>
            {/* row 3: spacer | down | spacer */}
            <div />
            <button type="button" className={btn} onClick={() => pan(0, -PAN_STEP)} aria-label="Pan down" tabIndex={-1}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <title>Pan down</title>
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>
            <div />
        </div>
    );
}

function InteractiveMermaid({ chart }: { chart: string }) {
    const [svgContent, setSvgContent] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            mermaid.initialize({
                startOnLoad: false,
                theme: "dark",
                flowchart: { useMaxWidth: false, htmlLabels: true },
            });
            initialized.current = true;
        }

        let isMounted = true;
        setError(null);
        setSvgContent("");

        const renderId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const renderDiagram = async () => {
            try {
                const { svg } = await mermaid.render(renderId, chart);
                if (!isMounted) return;

                // Mermaid returns an error SVG (with "Syntax error in text") instead
                // of throwing for some syntax issues. Check the raw string.
                if (/Syntax error in text/i.test(svg)) {
                    const match = svg.match(/<text[^>]*class="error-text"[^>]*>([\s\S]*?)<\/text>/i);
                    const raw = match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
                    const lines = raw
                        .split("\n")
                        .map((l) => l.trim())
                        .filter((l) => l && !/^mermaid version/i.test(l) && l !== "Syntax error in text");
                    setError(lines.length > 0 ? lines.join(" ") : "Invalid mermaid syntax");
                    return;
                }

                setSvgContent(svg);
            } catch (err) {
                if (isMounted) {
                    const message = err instanceof Error ? err.message : String(err);
                    const cleaned = message
                        .replace(/^Syntax error in text\s*/i, "")
                        .replace(/\s*mermaid version [\d.]+/gi, "")
                        .trim();
                    setError(cleaned || "Invalid mermaid syntax");
                }
            }
        };

        renderDiagram();

        return () => {
            isMounted = false;
            // mermaid.render() may leave a stray wrapper div in <body>.
            // Clean it up so it doesn't accumulate.
            const stray = document.getElementById(`d${renderId}`);
            if (stray) stray.remove();
        };
    }, [chart]);

    useEffect(() => {
        const ctx = transformRef.current;
        if (!ctx) return;

        const onKeyDown = (e: KeyboardEvent) => {
            const { positionX, positionY, scale } = ctx.state;
            const step = PAN_STEP;
            switch (e.key) {
                case "ArrowUp":
                    e.preventDefault();
                    ctx.setTransform(positionX, positionY + step, scale, 120);
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    ctx.setTransform(positionX, positionY - step, scale, 120);
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    ctx.setTransform(positionX + step, positionY, scale, 120);
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    ctx.setTransform(positionX - step, positionY, scale, 120);
                    break;
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    const viewer = error ? (
        <div className="flex flex-col items-center justify-center w-full h-full p-8">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400 mb-3 shrink-0">
                <title>Syntax error</title>
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6M9 9l6 6" />
            </svg>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400 mb-2">Syntax Error</p>
            <pre className="text-xs text-rose-300/70 text-center max-w-md leading-relaxed whitespace-pre-wrap break-words font-mono">{error}</pre>
        </div>
    ) : (
        <div className="relative flex items-center justify-center w-full h-full [&>svg]:max-w-none [&>svg]:w-full [&>svg]:h-full">
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: mermaid renders raw SVG */}
            <div className="w-full h-full flex items-center justify-center" dangerouslySetInnerHTML={{ __html: svgContent }} role="img" aria-label="Diagram preview" />
        </div>
    );

    const fsIconPath = isFullscreen ? "M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" : "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3";

    const diagramView = (
        <TransformWrapper ref={transformRef} initialScale={1} minScale={0.05} maxScale={5} centerOnInit={true} wheel={{ step: 0.004 }} pinch={{ step: 3 }} panning={{ velocityDisabled: true }} limitToBounds={false} zoomAnimation={{ animationTime: 150 }}>
            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
                {viewer}
            </TransformComponent>
        </TransformWrapper>
    );

    // Always keep TransformWrapper mounted in the same spot so zoom/pan state persists.
    // When fullscreen, portal the outer shell to body.
    // Single shell — identical styling in both modes. Fullscreen just portals & resizes.
    const shell = (
        <div className="relative flex-1 min-h-0 w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]">
            {diagramView}
            <PanControls transformRef={transformRef} />
            <button type="button" onClick={toggleFullscreen} className="absolute top-4 right-4 z-10 rounded bg-zinc-800/80 p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors" aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={fsIconPath} />
                </svg>
            </button>
        </div>
    );

    if (!isFullscreen) return shell;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: "#0a0a0a" }}>
            {shell}
        </div>,
        document.body,
    );
}

interface PreviewPanelProps {
    chart: string;
    id?: string;
    className?: string;
}

export default function PreviewPanel({ chart, id, className = "" }: PreviewPanelProps) {
    return (
        <section className={`flex h-full min-h-0 flex-col rounded-xl border border-border bg-surface/90 p-3 shadow-xl ${className}`}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">Preview</h2>
            <div className="mt-3 flex flex-1 min-h-0 flex-col" id={id}>
                <InteractiveMermaid chart={chart} />
            </div>
        </section>
    );
}
