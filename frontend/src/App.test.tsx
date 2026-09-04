import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// PreviewPanel imports mermaid at module scope and runs registerLayoutLoaders
// immediately. Render mermaid in jsdom is heavy/browser-coupled, so stub it here:
// the smoke test only checks that App mounts and surfaces the editor controls.
vi.mock("mermaid", () => ({
    default: {
        initialize: vi.fn(),
        render: vi.fn().mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><g>stub</g></svg>', bindFunctions: undefined }),
        registerLayoutLoaders: vi.fn(),
    },
}));

vi.mock("@mermaid-js/layout-elk", () => ({ default: {} }));

// Imported after mocks so the mocked modules are used transitively by App.
import App from "./App";

describe("<App/>", () => {
    it("mounts the editor with the API key field and mermaid textarea", async () => {
        render(<App />);

        expect(await screen.findByLabelText("X-API-Key", { selector: "input.password, input[type='password']" })).toBeTruthy();

        expect(await screen.findByLabelText("Mermaid source", { selector: "textarea" })).toBeTruthy();
    });

    it("starts with the default title", async () => {
        render(<App />);
        const title = (await screen.findByLabelText("Title", { selector: "input" })) as HTMLInputElement;
        expect(title.value).toBe("Untitled Diagram");
    });
});
