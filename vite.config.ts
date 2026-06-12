import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'SiteContextChat',
      formats: ['es', 'umd'],
      fileName: (format) =>
        format === 'es' ? 'site-context-chat.js' : 'site-context-chat.umd.cjs',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', '@supabase/supabase-js'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@supabase/supabase-js': 'Supabase',
        },
        assetFileNames: 'site-context-chat.[ext]',
      },
    },
  },
});
