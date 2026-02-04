import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Vite carga automáticamente las variables que empiezan por VITE_
    const env = loadEnv(mode, process.cwd(), ''); 
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // Eliminamos el bloque 'define' que exponía la clave innecesariamente
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
