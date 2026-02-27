import { useState } from 'react';
import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { useActionData, Form } from '@remix-run/react';

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const password = formData.get("password");
  const SITE_PASSWORD = context.cloudflare.env.SITE_PASSWORD;

  if (password === SITE_PASSWORD) {
    // 验证成功，设置 Cookie（有效期 7 天）
    return json(
      { success: true },
      {
        headers: {
          "Set-Cookie": `site_auth=${password}; Path=/; HttpOnly; Max-Age=604800`,
        },
      }
    );
  }

  return json({ error: "密码错误" }, { status: 401 });
}

export default function Login() {
  const actionData = useActionData<{ error?: string, success?: boolean }>();

  if (actionData?.success) {
    window.location.href = "/";
    return null;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
      <h1>身份验证</h1>
      <Form method="post" style={{ marginTop: '20px' }}>
        <input 
          type="password" 
          name="password" 
          placeholder="输入访问密码" 
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ marginLeft: '10px', padding: '10px 20px' }}>进入</button>
      </Form>
      {actionData?.error && <p style={{ color: 'red' }}>{actionData.error}</p>}
    </div>
  );
}
