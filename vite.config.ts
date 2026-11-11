import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: '小键盘大冒险',
        short_name: '小键盘',
        description: '4–6 年级儿童打字练习：边读课外书，边学打字',
        lang: 'zh-CN',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#E3F2FF',
        theme_color: '#FFC93C',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // 只缓存 woff2，不缓存 .woff（同一字体的旧格式，白占空间）
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  base: './',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    testTimeout: 15000,
  },
});
