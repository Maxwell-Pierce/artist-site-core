export class GitHubRepository {
 constructor(repository, token, request = (...args) => globalThis.fetch(...args)) {
  if (!/^[a-z\d_.-]+\/[a-z\d_.-]+$/i.test(repository)) throw Error('Enter repository as owner/name.');
  this.root = `https://api.github.com/repos/${repository}`; this.token = token; this.request = request;
 }
 async api(path, method = 'GET', body) {
  const response = await this.request(this.root + path, {method, cache:'no-store', headers:{Authorization:`Bearer ${this.token}`, Accept:'application/vnd.github+json','Content-Type':'application/json'}, ...(body ? {body:JSON.stringify(body)} : {})});
  if (!response.ok) {const error = Error(response.status === 409 || response.status === 422 ? 'The repository changed. Reconnect before publishing; your local draft is preserved.' : `GitHub request failed (${response.status}). Check repository access and token permissions.`); error.status=response.status; throw error;}
  return response.status === 204 ? null : response.json();
 }
 async head(branch) {return (await this.api('/git/ref/heads/' + encodeURIComponent(branch))).object.sha;}
 async read(path, ref) {
  try {
   const file = await this.api('/contents/' + path.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(ref));
   if (file.encoding !== 'base64') throw Error('File is too large for this editor.');
   return new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')), c => c.charCodeAt(0)));
  } catch (error) {if (error.status === 404) return null; throw error;}
 }
 async commit(branch, expected, files, message) {
  if (await this.head(branch) !== expected) throw Error('This branch changed. Reconnect before saving; your local draft is preserved.');
  const parent = await this.api('/git/commits/' + expected);
  const entries=await Promise.all(Object.entries(files).map(async([path,content])=>{
   if(typeof content==='string')return {path,mode:'100644',type:'blob',content};
   if(content?.encoding!=='base64'||typeof content.content!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(content.content))throw Error('Invalid binary file.');
   const blob=await this.api('/git/blobs','POST',{encoding:'base64',content:content.content});return {path,mode:'100644',type:'blob',sha:blob.sha};
  }));
  const tree = await this.api('/git/trees', 'POST', {base_tree:parent.tree.sha, tree:entries});
  const commit = await this.api('/git/commits', 'POST', {message, tree:tree.sha, parents:[expected]});
  await this.api('/git/refs/heads/' + encodeURIComponent(branch), 'PATCH', {sha:commit.sha, force:false});
  return commit.sha;
 }
 async branch(name, sha) {await this.api('/git/refs','POST',{ref:'refs/heads/'+name,sha});}
}
