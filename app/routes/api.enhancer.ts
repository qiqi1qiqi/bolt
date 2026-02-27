import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { StreamingTextResponse, parseStreamPart } from 'ai';
import { streamText } from '~/lib/.server/llm/stream-text';
import { stripIndents } from '~/utils/stripIndent';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Remix Action 入口：处理提示词优化请求
 */
export async function action(args: ActionFunctionArgs) {
  return enhancerAction(args);
}

/**
 * 核心逻辑：接收原始提示词并调用 LLM 生成优化版本
 */
async function enhancerAction({ context, request }: ActionFunctionArgs) {
  const { message } = await request.json<{ message: string }>();

  try {
    // 1. 调用 LLM，使用特定的 System Prompt 指导它仅输出优化后的内容
    const result = await streamText(
      [
        {
          role: 'user',
          content: stripIndents`
            I want you to improve the user prompt that is wrapped in \`<original_prompt>\` tags.
            
            IMPORTANT: 
            - Focus on clarity, technical detail, and actionable steps.
            - Only respond with the improved prompt text.
            - Do NOT include any introductory remarks, explanations, or backticks.
            
            <original_prompt>
              ${message}
            </original_prompt>
          `,
        },
      ],
      context.cloudflare.env,
    );

    // 2. 创建转换流：解析 AI SDK 的原始输出格式，提取纯文本内容
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        try {
          const decoded = decoder.decode(chunk);
          
          // 处理可能合并在一起的多行数据
          const lines = decoded.split('\n').filter((line) => line.trim() !== '');

          for (const line of lines) {
            try {
              const part = parseStreamPart(line);
              
              // 仅提取文本部分（part.type === 'text'）
              if (part.type === 'text') {
                controller.enqueue(encoder.encode(part.value));
              }
            } catch (e) {
              // 忽略解析失败的单行（例如不完整的 JSON）
              continue;
            }
          }
        } catch (error) {
          console.error('Transform error:', error);
        }
      },
    });

    // 3. 将 AI 流通过转换流进行过滤，并返回
    const transformedStream = result.toAIStream().pipeThrough(transformStream);

    return new StreamingTextResponse(transformedStream);
  } catch (error) {
    console.error('[Enhancer Error]:', error);

    return new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
