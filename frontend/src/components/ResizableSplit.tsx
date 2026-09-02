import { useCallback, useRef } from "react";

type Props = {
    /** "row": panels side-by-side (resize across width), "column": stacked (resize across height). */
    orientation: "row" | "column";
    /** Share (0..1) of the total split length given to the editor (first) pane. */
    ratio: number;
    onRatioChange: (value: number) => void;
    editor: React.ReactNode;
    preview: React.ReactNode;
};

const MIN_RATIO = 0.1;
const MAX_RATIO = 0.9;
const HANDLE = 16; // px width/height of the draggable divider

/** Small centered grip dots that read as "draggable" regardless of orientation. */
function Grip() {
    return (
        <div className="flex items-center justify-center gap-[3px]">
            {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="inline-block h-[3px] w-[3px] rounded-full bg-current text-accentSecondary opacity-80 transition group-hover:text-accent group-hover:opacity-100" />
            ))}
        </div>
    );
}

/**
 * Lightweight native resizer for the editor/preview split. A draggable divider
 * sits between the two panes: width when side-by-side (row), height when stacked
 * (column). The ratio is clamped and delegated upward so the caller can persist it.
 */
export default function ResizableSplit({ orientation, ratio, onRatioChange, editor, preview }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const row = orientation === "row";

    const clampRatio = useCallback(
        (value: number) => Math.min(MAX_RATIO, Math.max(MIN_RATIO, value)),
        [],
    );

    const handleMove = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            // Only resize while a button is held (avoids recalculating after pointer capture ends).
            if (event.buttons === 0) return;
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const total = row ? rect.width : rect.height;
            const pointerOffset = row ? event.clientX - rect.left : event.clientY - rect.top;
            // Subtract half the handle thickness so the divider stays centered on the pointer.
            onRatioChange(clampRatio((pointerOffset - HANDLE / 2) / total));
        },
        [row, onRatioChange, clampRatio],
    );

    const handleKey = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            const step = 0.02;
            const grow = row ? event.key === "ArrowRight" : event.key === "ArrowDown";
            const shrink = row ? event.key === "ArrowLeft" : event.key === "ArrowUp";
            if (!grow && !shrink) return;
            event.preventDefault();
            onRatioChange(clampRatio(ratio + (grow ? step : -step)));
        },
        [row, ratio, onRatioChange, clampRatio],
    );

    // Editor pane holds the resized share; min dimensions (0) allow flex to actually
    // shrink/kill content overflow so the preview never collapses behind it.
    const editorStyle = {
        flex: `0 0 ${ratio * 100}%`,
        minHeight: 0,
        minWidth: 0,
    };
    const dividerStyle = row ? { width: HANDLE } : { height: HANDLE };
    return (
        <div
            ref={containerRef}
            id="editor-preview-split"
            className="group flex min-h-0 min-w-0 flex-1"
            style={{ flexDirection: row ? "row" : "column" }}
        >
            <div style={editorStyle}>{editor}</div>

            <div
                role="separator"
                aria-orientation={row ? "vertical" : "horizontal"}
                aria-label="Resize editor and diagram panels"
                tabIndex={0}
                style={{ flexGrow: 0, flexShrink: 0, cursor: row ? "col-resize" : "row-resize", ...dividerStyle }}
                className="flex touch-none select-none items-center justify-center outline-none focus:ring-0"
                onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={handleMove}
                onKeyDown={handleKey}
            >
                <Grip />
            </div>

            <div className="min-h-0 min-w-0 flex-1">{preview}</div>
        </div>
    );
}
