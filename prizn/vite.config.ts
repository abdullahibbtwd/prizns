import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Shared root .env (repo root), with prizn/.env as optional override
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '')
  const localEnv = loadEnv(mode, __dirname, '')
  const env = { ...rootEnv, ...localEnv }

  return {
    plugins: [react(), tailwindcss()],
    envDir: path.resolve(__dirname, '..'),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: Number(env.WEB_PORT || 5175),
      proxy: {
        '/api': {
          target: `http://localhost:${env.API_PORT || 3003}`,
          changeOrigin: true,
        },
        '/feed.xml': {
          target: `http://localhost:${env.API_PORT || 3003}`,
          changeOrigin: true,
          rewrite: (p) => `/api${p}`,
        },
        '/feed.json': {
          target: `http://localhost:${env.API_PORT || 3003}`,
          changeOrigin: true,
          rewrite: (p) => `/api${p}`,
        },
        '/sitemap.xml': {
          target: `http://localhost:${env.API_PORT || 3003}`,
          changeOrigin: true,
          rewrite: (p) => `/api${p}`,
        },
      },
    },
  }
})
