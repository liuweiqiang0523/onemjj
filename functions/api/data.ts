import { loadPublicData } from '../../src/public-data';
export async function onRequestGet({ env, request }: { env: any; request: Request }) {
 const data = await loadPublicData(env, new URL(request.url));
 return new Response(JSON.stringify(data), {headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
}
