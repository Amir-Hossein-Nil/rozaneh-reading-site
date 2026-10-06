import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  site: process.env.SITE_ORIGIN || 'http://localhost:3200',
  security: { checkOrigin: true },
  vite: { ssr: { noExternal: ['@site/content', '@site/contracts', '@site/data-public'] } },
});
