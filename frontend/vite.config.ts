import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages hosts this project under /paleoGISfinnal/.
// Set BASE_PATH=/ when deploying to a root-domain host like Vercel.
const base = process.env.BASE_PATH ?? '/paleoGISfinnal/';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
});