/// <reference types="astro/client" />
interface ImportMetaEnv {
  DB_URL: string; // make sure to include "https://"
  DB_USERNAME: string;
  DB_PASSWORD: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}
