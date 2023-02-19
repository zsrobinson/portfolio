/// <reference types="astro/client" />
interface ImportMetaEnv {
  DB_USERNAME: string;
  DB_PASSWORD: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}
