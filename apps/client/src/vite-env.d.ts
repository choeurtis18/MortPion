/// <reference types="vite/client" />

// Augment env variables used by this app
interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
}
