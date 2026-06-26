import { useEffect, useRef, useState, useId } from "react";
import mermaid from "mermaid";
import elkLayouts from "@mermaid-js/layout-elk";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

mermaid.registerLayoutLoaders(elkLayouts);

// ── useInView (inlined) ──────────────────────────────────────────
function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { rootMargin: "-40px 0px", ...options },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
}

// ── InteractiveMermaid (inlined) ─────────────────────────────────
function InteractiveMermaid({ chart }: { chart: string }) {
  const [svgContent, setSvgContent] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    let isMounted = true;

    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
      },
    });

    const renderDiagram = async () => {
      try {
        const renderId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(renderId, chart);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err) {
        console.error("Mermaid rendering error:", err);
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [chart, id]);

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const renderViewer = (isFull: boolean) => (
    <div
      className={`relative flex items-center justify-center ${
        isFull
          ? "h-screen w-screen bg-zinc-950"
          : "h-[650px] w-full rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden"
      } bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]`}
    >
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-50 rounded bg-zinc-800/80 p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
        aria-label={isFull ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFull ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        )}
      </button>

      {svgContent ? (
        <TransformWrapper
          initialScale={1}
          minScale={0.05}
          maxScale={5}
          centerOnInit={true}
          wheel={{ step: 0.004 }}
          pinch={{ step: 3 }}
        >
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              className="flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-none w-full h-full p-8"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </TransformComponent>
        </TransformWrapper>
      ) : (
        <div className="flex items-center justify-center h-full w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="my-8">{renderViewer(false)}</div>
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur-sm animate-fade-in">
          {renderViewer(true)}
        </div>
      )}
    </>
  );
}

// ── Props ────────────────────────────────────────────────────────
interface DiagramRendererProps {
  id: string;
  chart: string;
  label: string;
  title: string;
  description: string;
}

// ── Exported component ───────────────────────────────────────────
export default function DiagramRenderer({
  id,
  chart,
  label,
  title,
  description,
}: DiagramRendererProps) {
  const { ref: sectionRef, inView: sectionInView } = useInView();
  const { ref: headerRef, inView: headerInView } = useInView();
  const { ref: chartRef, inView: chartInView } = useInView();

  return (
    <div
      id={id}
      ref={sectionRef}
      className={`py-24 transition-opacity duration-300 ${sectionInView ? "opacity-100" : "opacity-0"}`}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div
          ref={headerRef}
          className={`mb-16 transition-all duration-500 ${headerInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
        >
          <span className="font-mono text-xs text-accent tracking-[0.3em] uppercase">
            {label}
          </span>
          <h1 className="text-4xl lg:text-5xl font-bold text-zinc-100 mt-2 mb-4">
            {title}
          </h1>
          <p className="text-zinc-500 max-w-lg">{description}</p>
        </div>

        <div
          ref={chartRef}
          className={`transition-all duration-500 ${chartInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
          style={{ transitionDelay: "0.15s" }}
        >
          <InteractiveMermaid chart={chart} />
        </div>
      </div>
    </div>
  );
}
