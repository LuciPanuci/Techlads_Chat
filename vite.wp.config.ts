import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const outDir = resolve(__dirname, 'wordpress/site-context-chat/assets');

function wpBundle(entry: string, fileName: string, emptyOutDir: boolean) {
  return defineConfig({
    mode: 'production',
    plugins: [react()],
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env': JSON.stringify({ NODE_ENV: 'production' }),
    },
    build: {
      outDir,
      emptyOutDir,
      cssCodeSplit: false,
      lib: {
        entry: resolve(__dirname, entry),
        formats: ['iife'],
        name: 'SccBoot',
        fileName: () => fileName,
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          assetFileNames: 'site-context-chat.[ext]',
        },
      },
    },
  });
}

/** Self-contained IIFE bundles for WordPress (React + Supabase inlined, one file each). */
export default defineConfig(({ mode }) => {
  if (mode === 'admin') {
    return wpBundle('src/wp-admin-mount.jsx', 'admin.js', false);
  }

  return wpBundle('src/wp-mount.jsx', 'widget.js', true);
});
