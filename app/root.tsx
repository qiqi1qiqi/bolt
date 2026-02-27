import { useStore } from '@nanostores/react';
import { json, redirect, type LoaderFunctionArgs, type LinksFunction } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect } from 'react';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';

/**
 * 身份验证 Loader
 * 检查环境变量 SITE_PASSWORD 和浏览器的 Cookie
 */
export async function loader({ context, request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  
  // 从 Cloudflare 环境变量中获取密码
  const SITE_PASSWORD = (context.cloudflare?.env as any)?.SITE_PASSWORD;

  // 如果没有设置密码，则默认公开访问
  if (!SITE_PASSWORD) {
    return json({});
  }

  // 检查 Cookie 中是否存有正确的认证信息
  const cookie = request.headers.get("Cookie");
  const isAuthenticated = cookie?.includes(`site_auth=${SITE_PASSWORD}`);

  // 如果已经通过认证，或者当前正在访问 /login 页面，则允许继续
  if (isAuthenticated || url.pathname === "/login") {
    return json({});
  }

  // 否则，重定向到登录页面
  return redirect("/login");
}

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();
  function setTutorialKitTheme() {
    let theme = localStorage.getItem('bolt_theme');
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      {children}
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

export default function App() {
  return <Outlet />;
}
