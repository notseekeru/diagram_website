interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: string;
  readonly VITE_BACKEND_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
  glob: <T = unknown>(
    pattern: string,
    options?: {
      query?: string;
      import?: string;
      eager?: boolean;
    },
  ) => Record<string, T>;
}
