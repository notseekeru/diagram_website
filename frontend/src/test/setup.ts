// Headless globals that the app relies on at render time but are not fully
// usable in this jsdom build:
//  - window.matchMedia is an undefined, non-writable property here; App's
//    useIsDesktop() calls it during initial render.
//    AI HERE: always report "not desktop" (matches:false), so the desktop-only
//    RecentBar never mounts. Upgrade path: let vitest --environment define a
//    mock media list by breakpoint if a layout/mobile test is ever added.
//  - window.ResizeObserver is absent; react-zoom-pan-pinch creates one on mount.
if (typeof window.matchMedia !== "function") {
    Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: (query: string): MediaQueryList => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
        }),
    });
}

if (!window.ResizeObserver) {
    class ResizeObserverStub {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
    }
    window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
