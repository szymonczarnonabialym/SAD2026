import assert from 'node:assert/strict';
// @ts-ignore Node's TypeScript runner requires the source extension.
import {readJson} from '../lib/read-response-json.ts';

const success={farm:{records:[],appliedIds:['request-id']}};
assert.deepEqual(await readJson(Response.json(success)),success);
assert.deepEqual(await readJson(Response.json({error:'Konflikt wpisu'},{status:409})),{error:'Konflikt wpisu'});
for(const status of [200,502,503]){
 let pending=['request-id'];
 const sync=async()=>{await readJson(new Response('<html>Unavailable</html>',{status}));pending=pending.slice(1)};
 await assert.rejects(sync,status===200?/nieczytelną odpowiedź/:new RegExp('HTTP '+status));
 assert.deepEqual(pending,['request-id'],'An unreadable response must leave the pending entry available for retry.');
}
console.log('PASS: JSON success/errors, malformed responses and preservation of pending entries.');
