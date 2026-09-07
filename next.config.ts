import type { NextConfig } from 'next'

const repoName = 'market-ai-horizon'
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true'
const isStaticExport = isGitHubPages || process.env.STATIC_EXPORT === 'true'

const nextConfig: NextConfig = {
  output: isStaticExport ? 'export' : undefined,
  basePath: isGitHubPages ? `/${repoName}` : undefined,
  assetPrefix: isGitHubPages ? `/${repoName}/` : undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: isGitHubPages ? `/${repoName}` : '',
    NEXT_PUBLIC_STATIC_HISTORY: isStaticExport ? 'true' : 'false',
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
