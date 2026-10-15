import handler from 'vinext/server/fetch-handler';
import { passwordAuth, type PasswordEnv } from '../lib/password-auth';
import { publicOffer, manageOffer } from '../lib/site-offer';

export default {
  async fetch(request: Request, env: Cloudflare.Env & PasswordEnv, ctx: ExecutionContext) {
    try {
      const path=new URL(request.url).pathname;
      if(path==='/api/public/offer')return await publicOffer(request,env.DB);
      const authorized = await passwordAuth(request, env);
      if(!(authorized instanceof Response)&&path==='/api/site-offer'&&env.DB)return await manageOffer(authorized,env.DB);
      return authorized instanceof Response ? authorized : handler.fetch(authorized,env,ctx);
    } catch {
      // Do not log credentials, cookies or configuration secrets on auth failures.
      return Response.json({error:'Nie udało się obsłużyć logowania. Spróbuj ponownie.'},{status:503,headers:{'Cache-Control':'no-store'}});
    }
  },
};
