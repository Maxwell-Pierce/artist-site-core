const KEY='artist-studio:remembered-connection';
export function rememberConnection(storage,connection,now=Date.now()){storage.setItem(KEY,JSON.stringify({...connection,expires:now+30*24*60*60*1000}));}
export function forgottenConnection(storage){storage.removeItem(KEY);}
export function rememberedConnection(storage,now=Date.now()){
 try{const saved=JSON.parse(storage.getItem(KEY));if(!saved)return null;if(!saved.repository||!saved.branch||!saved.token||!saved.expires||saved.expires<=now){storage.removeItem(KEY);return null;}return saved;}catch{return null;}
}
