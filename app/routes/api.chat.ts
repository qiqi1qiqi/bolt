import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS } from '~/lib/.server/llm/constants';
import { CONTINUE_PROMPT } from '~/lib/.server/llm/prompts';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';

/**
 * Remix Action 入口，处理 POST 请求
 */
export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

/**
 * 核心聊天逻辑：支持流式输出与自动续写
 */
async function chatAction({ context, request }: ActionFunctionArgs) {
  const { messages } = await request.json<{ messages: Messages }>();

  // 初始化可切换流，用于处理响应截断后的自动续写
  const stream = new SwitchableStream();

  try {
    const options: StreamingOptions = {
      toolChoice: 'none',
      onFinish: async ({ text: content, finishReason }) => {
        // 如果结束原因不是因为长度限制（即已经回答完毕），则关闭流
        if (finishReason !== 'length') {
          return stream.close();
        }

        // 检查续写次数是否超过最大分段限制
        if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
          throw Error('Cannot continue message: Maximum segments reached');
        }

        const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;

        console.log(
          `Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`
        );

        // 将当前已生成的内容和续写提示词推入消息列表
        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: CONTINUE_PROMPT });

        // 再次调用 LLM 进行续写
        const result = await streamText(messages, context.cloudflare.env, options);

        // 切换流源，实现无缝衔接
        return stream.switchSource(result.toAIStream());
      },
    };

    // 初始调用 LLM
    const result = await streamText(messages, context.cloudflare.env, options);

    stream.switchSource(result.toAIStream());

    // 返回流式响应
    return new Response(stream.readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('[Chat API Error]:', error);

    // 返回 500 错误响应
    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
