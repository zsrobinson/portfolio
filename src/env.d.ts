/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
interface ImportMetaEnv {
  DB_URL: string; // make sure to include "https://"
  DB_AUTH_COLLECTION: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}
