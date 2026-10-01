import handler from 'vinext/server/fetch-handler';
import { authorizeCloudflareRequest, type AccessConfig } from '../lib/cloudflare-auth';

export default {
  async fetch(request: Request, env: Cloudflare.Env & AccessConfig, ctx: ExecutionContext) {
    const authorized = await authorizeCloudflareRequest(request, env);
    if (authorized instanceof Response) return authorized;
    const url = new URL(request.url);
    if (url.pathname === '/signin-with-chatgpt' || url.pathname === '/callback') {
      return new Response(null, { status: 302, headers: { Location: '/', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/signout-with-chatgpt') {
      return new Response(null, { status: 302, headers: { Location: '/cdn-cgi/access/logout', 'Cache-Control': 'no-store' } });
    }
    return handler.fetch(authorized, env, ctx);
  },
};
