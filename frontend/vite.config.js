import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The frontend imports pure-logic modules straight from ../backend/src (rule
// engine, classifier, fixture adapter) so there is one source of truth instead
// of a duplicated copy — this widens the dev server's allowed file scope to
// the repo root so those imports resolve. It never imports bedrockAdapter.js
// (that one pulls in the AWS SDK and stays server/Node-side only).
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
})
