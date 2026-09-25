import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        racing: resolve(__dirname, 'games/racing/index.html'),
        creator: resolve(__dirname, 'games/creator/index.html'),
        play: resolve(__dirname, 'games/play/index.html'),
        cooking: resolve(__dirname, 'games/cooking/index.html'),
        war: resolve(__dirname, 'games/war/index.html'),
        train: resolve(__dirname, 'games/train/index.html'),
        obby: resolve(__dirname, 'games/obby/index.html'),
        metro: resolve(__dirname, 'games/metro/index.html'),
        mmp1: resolve(__dirname, 'games/mmp1/index.html'),
        rocket: resolve(__dirname, 'games/rocket/index.html'),
        crown: resolve(__dirname, 'games/crown/index.html'),
        citycar: resolve(__dirname, 'games/citycar/index.html'),
        defender: resolve(__dirname, 'games/defender/index.html'),
        breakout: resolve(__dirname, 'games/breakout/index.html')
      }
    }
  }
});
