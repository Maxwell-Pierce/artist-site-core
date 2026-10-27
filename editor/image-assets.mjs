export function imageAsset(dataURL,key){
 const match=/^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataURL);
 if(!match||match[2].length>2800000||!/^[a-f0-9]{16,64}$/.test(key))throw Error('Choose an image that compresses below 2 MB.');
 const path=`assets/uploads/${key}.${match[1]==='jpeg'?'jpg':match[1]}`;
 return {path,file:{encoding:'base64',content:match[2],mime:'image/'+match[1]}};
}
export function imageFiles(assets={}){
 const result={};for(const [path,file]of Object.entries(assets)){
  if(!/^assets\/uploads\/[a-f0-9]{16,64}\.(webp|png|jpg)$/.test(path)||!file||file.encoding!=='base64'||!/^image\/(webp|png|jpeg)$/.test(file.mime)||!/^[A-Za-z0-9+/]+={0,2}$/.test(file.content)||file.content.length>2800000)throw Error('Invalid uploaded image.');
  result[path]={encoding:'base64',content:file.content};
 }return result;
}
export const imageSource=(path,assets={})=>assets[path]?`data:${assets[path].mime};base64,${assets[path].content}`:path;
export async function prepareImage(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>25*1024*1024)throw Error('Choose a PNG, JPEG or WebP image under 25 MB.');
 const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas'),scale=Math.min(1,2048/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 let data=canvas.toDataURL('image/webp',.86);if(data.length>2800000)data=canvas.toDataURL('image/webp',.65);
 const bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0)),hash=await crypto.subtle.digest('SHA-256',bytes),key=[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,24);return imageAsset(data,key);
}
