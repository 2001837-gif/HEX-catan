# Bundles engine + bot + server logic + client into ONE html file that runs fully in the browser
# (a loopback WebSocket replaces the network, so the real server code is reused unchanged).
import json
R=lambda p:open(p).read()
mods={'./engine':R('server/engine.js'),'./ck':R('server/ck.js'),'./bot':R('server/bot.js'),'./server':R('server/index.js')}
mod_js=''.join(f"def({json.dumps(k)},function(module,exports,require,__dirname,process){{\n{v}\n}});\n" for k,v in mods.items())
runtime = r"""
(function(){
 // localStorage can be blocked in sandboxed frames: fall back to memory
 try{localStorage.setItem('_t','1');localStorage.removeItem('_t');}catch(e){var mem={};Object.defineProperty(window,'localStorage',{value:{getItem:function(k){return k in mem?mem[k]:null},setItem:function(k,v){mem[k]=String(v)},removeItem:function(k){delete mem[k]}}});}
 var defs={},cache={};
 function def(n,f){defs[n]=f}
 function Emitter(){this.h={}}
 Emitter.prototype.on=function(e,f){(this.h[e]=this.h[e]||[]).push(f);return this};
 Emitter.prototype.emit=function(e){var a=[].slice.call(arguments,1);(this.h[e]||[]).forEach(function(f){f.apply(null,a)})};
 function hex(n){var a=new Uint8Array(n);crypto.getRandomValues(a);return Array.from(a).map(function(x){return('0'+x.toString(16)).slice(-2)}).join('')}
 var stubs={
  crypto:{randomInt:function(n){var a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n},randomBytes:function(n){var h=hex(n);return{toString:function(){return h}}}},
  http:{createServer:function(){return{on:function(){},listen:function(){}}}},
  fs:{readFile:function(){}}, path:{join:function(){return ''},normalize:function(p){return p},extname:function(){return ''}},
  './ws-lite':{WebSocketServer:function(){var self=this;Emitter.call(this);window.__wss=this;}}
 };
 stubs['./ws-lite'].WebSocketServer.prototype=Object.create(Emitter.prototype);
 function req(n){
  if(n==='ws')throw new Error('no ws');
  if(stubs[n])return stubs[n];
  if(cache[n])return cache[n].exports;
  var m={exports:{}};cache[n]=m;defs[n](m,m.exports,req,'/',{env:{}});return m.exports;
 }
 """+mod_js+r"""
 // loopback socket pair
 function ServerSocket(){Emitter.call(this);this.readyState=1}
 ServerSocket.prototype=Object.create(Emitter.prototype);
 ServerSocket.prototype.send=function(d){var c=this.client;if(c&&c.readyState===1)setTimeout(function(){c.onmessage&&c.onmessage({data:d})},0)};
 ServerSocket.prototype.close=function(){this.readyState=3;this.emit('close')};
 function FakeWS(){
  var self=this;self.readyState=0;var s=new ServerSocket();s.client=self;self.s=s;
  setTimeout(function(){window.__wss.emit('connection',s);self.readyState=1;self.onopen&&self.onopen()},20);
 }
 FakeWS.prototype.send=function(d){var s=this.s;setTimeout(function(){s.emit('message',d)},0)};
 FakeWS.prototype.close=function(){this.readyState=3;this.s.readyState=3;this.s.emit('close');this.onclose&&this.onclose()};
 req('./server');
 window.WebSocket=FakeWS;
 // ---- online play without a server: the page that HOSTS runs the game server, and every friend's page
 // talks to it through this artifact's shared database (db capability). One doc per direction per player.
 var MP={avail:false,role:null,code:null,db:null,cid:hex(4),i:0,q:[],last:0};
 var dbReady=(window.claude&&window.claude.use?window.claude.use('db').catch(function(){return null}):Promise.resolve(null)).then(function(d){MP.db=d;MP.avail=!!d;return d});
 function VClient(host,cid){this.readyState=1;this.cid=cid;this.out=[];this.n=0;this.busy=false;this.dirty=false;this.timer=null;var self=this;
  this.onmessage=function(e){
   var t;try{t=JSON.parse(e.data).t}catch(x){t=''}
   if(t==='game')self.out=self.out.filter(function(m){return m.t!=='game'});
   self.out.push({i:++self.n,t:t,d:e.data});
   while(self.out.length>14)self.out.shift();
   var sz=0;self.out.forEach(function(m){sz+=m.d.length});
   while(sz>180000&&self.out.length>1){sz-=self.out.shift().d.length}
   self.dirty=true;self.sched()};
  this.host=host}
 VClient.prototype.sched=function(){var s=this;if(s.timer||s.busy)return;s.timer=setTimeout(function(){s.timer=null;s.flush()},180)};
 VClient.prototype.flush=function(){var s=this;if(!s.dirty||s.busy)return;s.dirty=false;s.busy=true;
  MP.db.doc('mp/'+MP.code+'/out/'+s.cid).set({n:s.n,m:s.out.map(function(m){return{i:m.i,d:m.d}})}).catch(function(){s.dirty=true}).then(function(){s.busy=false;if(s.dirty)s.sched()})};
 MP.host=function(cb){
  dbReady.then(function(db){
   if(!db)return cb('Shared storage is unavailable. Open this page while signed in to claude.ai, with Contributor access.');
   if(MP.role==='host')return cb(null,MP.code);
   var code=hex(3).toUpperCase();MP.role='host';MP.code=code;var clients={};
   var beat=function(){db.doc('mp/'+code).set({t:Date.now(),code:code}).catch(function(e){var x=document.getElementById('mperr2');if(!x){x=document.createElement('div');x.id='mperr2';x.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#b3261e;color:#fff;padding:8px;font:13px sans-serif';document.body.appendChild(x)}x.textContent='Room not visible to friends: could not save to shared storage ('+(e&&e.message||e)+'). You need Contributor/owner access on this page.'})};beat();setInterval(beat,20000);
   db.collection('mp/'+code+'/in').onSnapshot(function(snap){
    snap.docChanges().forEach(function(ch){
     if(ch.type==='removed')return;var d=ch.doc.data()||{},cid=ch.doc.id,c=clients[cid];
     if(!c){var s=new ServerSocket();c=clients[cid]={s:s,last:0,seen:Date.now()};var vc=new VClient(MP,cid);c.vc=vc;s.client=vc;
      s.close=function(){this.readyState=3;vc.onmessage({data:JSON.stringify({t:'__close'})});this.emit('close')};
      window.__wss.emit('connection',s)}
     c.seen=Date.now();
     (d.q||[]).forEach(function(m){if(m.i>c.last){c.last=m.i;c.s.emit('message',m.d)}})})},function(){});
   setInterval(function(){Object.keys(clients).forEach(function(k){var c=clients[k];if(Date.now()-c.seen>70000){c.s.readyState=3;c.s.emit('close');delete clients[k]}})},15000);
   cb(null,code)})};
 function BridgeWS(){var self=this;self.readyState=0;
  setTimeout(function(){MP.db.doc('mp/'+MP.code+'/out/'+MP.cid).onSnapshot(function(snap){
    if(!snap.exists)return;var d=snap.data()||{};(d.m||[]).forEach(function(m){if(m.i>MP.last){MP.last=m.i;
     if(m.d.indexOf('"t":"__close"')>0){self.readyState=3;self.onclose&&self.onclose();return}
     self.onmessage&&self.onmessage({data:m.d})}})},function(){});
   self.readyState=1;self.onopen&&self.onopen();MP.push()},20)}
 BridgeWS.prototype.send=function(d){MP.q.push({i:++MP.i,d:d});MP.q=MP.q.slice(-20);MP.push()};
 BridgeWS.prototype.close=function(){this.readyState=3};
 MP.pushing=false;MP.pend=false;
 MP.push=function(){if(MP.pushing){MP.pend=true;return}if(MP.tm)return;MP.tm=setTimeout(function(){MP.tm=null;MP.pushing=true;
   MP.db.doc('mp/'+MP.code+'/in/'+MP.cid).set({q:MP.q,hb:Date.now()}).catch(function(){}).then(function(){MP.pushing=false;if(MP.pend){MP.pend=false;MP.push()}})},120)};
 MP.join=function(code,cb){
  dbReady.then(function(db){
   if(!db)return cb('Shared storage is unavailable. Open this page while signed in to claude.ai, with Contributor access.');
   code=String(code||'').trim().toUpperCase();
   db.doc('mp/'+code).get().then(function(snap){
    var d=snap.exists&&snap.data();if(!d)return cb('Room '+code+' not found in shared storage. Check the code, and ask the host to keep the Lobby tab open.');if(Date.now()-d.t>300000)return cb('Room '+code+' exists but the host stopped responding '+Math.round((Date.now()-d.t)/60000)+' min ago. Ask them to reopen the tab and host again.');
    MP.role='guest';MP.code=code;MP.last=0;MP.i=0;MP.q=[];window.WebSocket=BridgeWS;setInterval(MP.push,20000);cb(null,code)
   }).catch(function(e){cb('Could not read shared storage: '+(e&&e.message||e)+'. You may need Contributor access.')})})};
 window.__mp=MP;
})();
"""
app=R('public/app.js').replace("!confirm('Leave the game? Your seat will be played automatically.')","false")
html=f"""<title>HexColony</title>
<style>:root{{color-scheme:dark}}
{R('public/style.css')}
#preview-note{{background:#0a3a5f;color:#bcd6ee;font-size:11px;line-height:16px;text-align:center;padding:3px 8px}}
#game{{height:calc(100vh - 44px - 22px)!important}}
@media(max-width:900px){{#game{{height:auto!important}}}}
</style>
<div id="preview-note">Browser build: play bots solo, or open Lobby to host/join a friend's game online (everyone needs claude.ai access to this page).</div>
<div id="banner" hidden></div><div id="app"></div><div id="toasts"></div>
<script>{runtime}</script>
<script>{app}</script>
"""
open('dist/preview.html','w').write(html)
print(len(html))
