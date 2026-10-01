// Separate target for the user's Cloudflare account. npm run build retains Sites.
process.env.SAD_DEPLOY_TARGET = 'cloudflare';
process.argv = [process.execPath, new URL('./run-framework.mjs', import.meta.url).pathname, 'build'];
await import('./run-framework.mjs');
