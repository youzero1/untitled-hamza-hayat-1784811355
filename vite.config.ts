import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

const forceFullReload = {
  name: 'force-full-reload',
  handleHotUpdate({ server }: { server: any }) {
    server.ws.send({ type: 'full-reload' });
    return [];
  },
};

export default defineConfig({
  root: projectRoot,
  plugins: [react(), forceFullReload],
  resolve: {
    alias: { '@': path.join(projectRoot, 'src') },
  },
});
