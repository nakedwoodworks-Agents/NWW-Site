import { defineConfig } from 'astro/config';
export default defineConfig({
  site: process.env.SITE_URL || 'https://nww-site.pages.dev',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
