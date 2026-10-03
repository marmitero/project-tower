/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Debug Mode (§77/§93): `"true"` só em desenvolvimento. */
  readonly VITE_DEBUG_MODE?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
