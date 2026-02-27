import { createAnthropic } from '@ai-sdk/anthropic';

// 增加一个参数用来接收环境变量
export function getAnthropicModel(apiKey: string, baseUrl?: string) {
  const anthropic = createAnthropic({
    apiKey,
    baseURL: baseUrl || 'https://api.anthropic.com/v1', // 如果变量没传，默认用官方的
  });

  return anthropic('glm-4.7');
}
