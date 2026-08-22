import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/games/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        airplane: resolve(__dirname, 'games/airplane/index.html'),
        racing: resolve(__dirname, 'games/racing/index.html'),
        creator: resolve(__dirname, 'games/creator/index.html'),
        play: resolve(__dirname, 'games/play/index.html'),
        cooking: resolve(__dirname, 'games/cooking/index.html')
      }
    }
  }
});
