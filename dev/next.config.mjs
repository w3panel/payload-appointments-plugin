import { withPayload } from '@payloadcms/next/withPayload'
import { fileURLToPath } from 'url'
import path from 'path'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(dirname, '..', '..', '..')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next sometimes picks the wrong workspace root in monorepos
  // (especially when multiple lockfiles exist), which can break tracing/chunk loading.
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    // Ensure Turbopack resolves packages (like `next`) from the monorepo root
    // rather than incorrectly inferring `dev/app` as the project root.
    root: workspaceRoot,
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
