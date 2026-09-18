import { defineConfig, globalIgnores } from 'eslint/config'
import nextTypescript from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextTypescript,
  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts']),
])