export function isPublicIP(ip:string):boolean;
export function classify(status:number):string;
export function collectLinks(value:unknown):string[];
export function requestPublic(raw:string,redirects?:number):Promise<{status:number;body:string;finalURL:string}>;
