import handler from 'vinext/server/fetch-handler';
import { passwordAuth, type PasswordEnv } from '../lib/password-auth';
import { publicOffer, manageOffer } from '../lib/site-offer';

export default {
  async fetch(request: Request, env: Cloudflare.Env & PasswordEnv, ctx: ExecutionContext) {
    const path=new URL(request.url).pathname;
    try {
      if(path==='/api/public/offer')return await publicOffer(request,env.DB);
      const authorized = await passwordAuth(request, env);
      if(!(authorized instanceof Response)&&path==='/api/site-offer'&&env.DB)return await manageOffer(authorized,env.DB);
      return authorized instanceof Response ? authorized : await handler.fetch(authorized,env,ctx);
    } catch (error) {
      // Log only the path and error type/message: never the request, credentials, cookies or secrets.
      console.error('Request failed', request.method, path, error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error');
      return Response.json({error:'Nie udało się obsłużyć żądania. Spróbuj ponownie.'},{status:503,headers:{'Cache-Control':'no-store'}});
    }
  },
};
