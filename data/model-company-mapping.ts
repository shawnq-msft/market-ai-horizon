export type ModelCompanyMapping = {
  companyId: string
  keywords: string[]
  openRouterIds?: string[]
}

export const modelCompanyMappings: ModelCompanyMapping[] = [
  { companyId: 'openai', keywords: ['openai', 'gpt', 'o1', 'o3', 'o4'], openRouterIds: ['openai/'] },
  { companyId: 'anthropic', keywords: ['anthropic', 'claude'], openRouterIds: ['anthropic/'] },
  { companyId: 'googl', keywords: ['google', 'gemini', 'deepmind'], openRouterIds: ['google/'] },
  { companyId: 'meta', keywords: ['meta', 'llama'], openRouterIds: ['meta-llama/', 'meta/'] },
  { companyId: 'xai', keywords: ['xai', 'grok'], openRouterIds: ['x-ai/'] },
  { companyId: 'mistral', keywords: ['mistral'], openRouterIds: ['mistralai/'] },
  { companyId: 'baba', keywords: ['alibaba', 'qwen', 'tongyi'], openRouterIds: ['qwen/'] },
  { companyId: 'deepseek', keywords: ['deepseek'], openRouterIds: ['deepseek/'] },
  { companyId: 'minimax', keywords: ['minimax', 'abab'], openRouterIds: ['minimax/'] },
  { companyId: 'zhipu-glm', keywords: ['zhipu', 'glm', 'chatglm'], openRouterIds: ['z-ai/', 'thudm/'] },
  { companyId: 'bytedance', keywords: ['bytedance', 'doubao', 'seed'], openRouterIds: ['bytedance/'] },
  { companyId: 'moonshot-kimi', keywords: ['moonshot', 'kimi'], openRouterIds: ['moonshotai/'] },
  { companyId: 'tencent', keywords: ['tencent', 'hunyuan'], openRouterIds: ['tencent/'] },
  { companyId: 'bidu', keywords: ['baidu', 'ernie'], openRouterIds: ['baidu/'] },
  { companyId: 'iflytek', keywords: ['iflytek', 'spark', 'xinghuo'], openRouterIds: ['iflytek/'] },
]
