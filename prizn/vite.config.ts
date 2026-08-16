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
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text-summary', 'lcov', 'text'],
        include: ['src/lib/**', 'src/hooks/**', 'src/components/**', 'src/cms/**'],
        exclude: [
          '**/*.{test,spec}.{ts,tsx}',
          'src/test/**',
          'src/data/**',
          'src/main.tsx',
          'src/App.tsx',
          '**/cms-types.ts',
          '**/cms/data/mock.ts',
          '**/StoryEditorPage.tsx',
          '**/SocialPage.tsx',
          '**/ProductsPage.tsx',
          '**/SeriesEditorPage.tsx',
          '**/ContentPages.tsx',
          '**/NewsletterPage.tsx',
          '**/StoryYearPage.tsx',
          '**/SubmissionDetailPage.tsx',
          '**/ContactDetailPage.tsx',
          '**/AuthorEditorPage.tsx',
          '**/CmsLayout.tsx',
          '**/CmsApp.tsx',
          '**/AiAssistantPanel.tsx',
          '**/CmsMultiSelect.tsx',
          '**/NarrationPanel.tsx',
          '**/MinimalNav.tsx',
          '**/contribute/shared.tsx',
        ],
        thresholds: {
          lines: 70,
          statements: 70,
          functions: 65,
          branches: 40,
        },
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
        '/robots.txt': {
          target: `http://localhost:${env.API_PORT || 3003}`,
          changeOrigin: true,
          rewrite: (p) => `/api${p}`,
        },
      },
    },
  }
})
