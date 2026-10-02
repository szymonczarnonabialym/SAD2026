import handler from 'vinext/server/fetch-handler';
import { passwordAuth, type PasswordEnv } from '../lib/password-auth';

export default {
  async fetch(request: Request, env: Cloudflare.Env & PasswordEnv, ctx: ExecutionContext) {
    try {
      const authorized = await passwordAuth(request, env);
      return authorized instanceof Response ? authorized : handler.fetch(authorized,env,ctx);
    } catch {
      // Do not log credentials, cookies or configuration secrets on auth failures.
      return Response.json({error:'Nie udało się obsłużyć logowania. Spróbuj ponownie.'},{status:503,headers:{'Cache-Control':'no-store'}});
    }
  },
};
