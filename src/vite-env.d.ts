interface ImportMetaEnv {
  readonly VITE_OPENROUTER_API_KEY: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_OPENROUTER_BASE_URL?: string;
  readonly VITE_OPENAI_BASE_URL?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_SITE_NAME?: string;
  readonly VITE_OPENROUTER_MODEL?: string;
  readonly VITE_OPENAI_MODEL?: string;
  readonly VITE_SYSTEM_PROMPT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
