import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
class Element {
  constructor(){this.children=[];this.events={};this.value='';this.hidden=false;this.attributes={};}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(){this.children=[];}
  setAttribute(k,v){this.attributes[k]=v;}
  removeAttribute(k){delete this[k];}
  addEventListener(k,fn){this.events[k]=fn;}
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const fresh=(extra={})=>({total:8,checkedAt:new Date().toISOString(),byTrade:{Electrical:2},sources:[{name:'County',available:true},{name:'Other',available:false}],...extra});
async function preview(responses){
 const nodes=Object.fromEntries(['results','status','retry','trade','search','sector','kind'].map(k=>[k,new Element()]));
 const requests=[];
 const context={document:{getElementById:id=>nodes[id],createElement:()=>new Element()},location:{hostname:'bidradaralerts.com',origin:'https://bidradaralerts.com'},URL,AbortSignal,setInterval(){},fetch:async(url,options)=>{requests.push({url,options});const data=responses.shift();if(data instanceof Error)throw data;return {ok:data!==undefined,json:async()=>data};}};
 vm.runInNewContext(fs.readFileSync('preview.js','utf8'),context);await flush();return {nodes,requests};
}
test('stale local feed falls back to same-origin API and discloses partial coverage',async()=>{
 const {nodes,requests}=await preview([fresh({checkedAt:'2000-01-01'}),fresh()]);
 assert.equal(requests[1].url,'https://bidradaralerts.com/opportunities?summary=3');
 assert.match(nodes.status.textContent,/8 source notices/);assert.match(nodes.status.textContent,/Coverage is incomplete/);
 assert.equal(nodes.results.attributes['aria-busy'],'false');assert.equal(nodes.retry.hidden,true);
 assert.match(nodes.results.children[0].textContent,/totals only/);
});
test('timeout/network errors show retry and a retry can recover',async()=>{
 const queue=[new Error('timeout'),new Error('network')];const {nodes}=await preview(queue);
 assert.equal(nodes.retry.hidden,false);assert.match(nodes.status.textContent,/unavailable or outdated/);
 queue.push(undefined,fresh());await nodes.retry.events.click();assert.equal(nodes.retry.hidden,true);
});
test('malformed or future API data fails closed',async()=>{
 for(const data of [fresh({total:-1}),fresh({total:true}),fresh({checkedAt:new Date(Date.now()+900000).toISOString()}),null]){
 const {nodes}=await preview([undefined,data]);assert.equal(nodes.retry.hidden,false);assert.equal(nodes.results.children.length,0);
 }
});
test('multi-trade records filter correctly; an empty search never shows unrelated source cards',async()=>{
 const {nodes}=await preview([fresh({opportunities:[{title:'Lighting',trades:['Electrical','Construction'],sourceUrl:'https://example.gov/bid'}]})]);
 nodes.trade.value='Electrical';nodes.trade.events.input();assert.equal(nodes.results.children.length,1);
 assert.equal(nodes.results.children[0].children[1].textContent,'Lighting');
 nodes.search.value='nonexistent';nodes.search.events.input();assert.match(nodes.results.children[0].textContent,/No usable notices match/);
});
test('untrusted titles are text and unsafe URL schemes/credentials are rejected',async()=>{
 const {nodes}=await preview([fresh({opportunities:[{title:'<script>bad</script>',url:'https://example.gov/bid'},{title:'bad',url:'javascript:alert(1)'},{title:'bad',url:'https://user:pass@example.gov'}]})]);
 assert.equal(nodes.results.children.length,1);assert.equal(nodes.results.children[0].children[1].textContent,'<script>bad</script>');
});
async function billing(config){
 const nodes=Object.fromEntries(['preferences','preference-summary','test-checkout','billing-status'].map(k=>[k,new Element()]));nodes.preferences.querySelectorAll=()=>[{value:'HVAC'},{value:'Electrical'}];
 vm.runInNewContext(fs.readFileSync('onboarding.js','utf8'),{document:{querySelector:s=>nodes[s.slice(1)]},URL,AbortSignal,fetch:async()=>({ok:true,json:async()=>config})});await flush();return nodes;
}
test('checkout rejects live, missing, foreign and malformed test links',async()=>{
 for(const config of [{mode:'test',checkoutUrl:null},{mode:'live',checkoutUrl:'https://buy.stripe.com/test_abc'},{mode:'test',checkoutUrl:'https://buy.stripe.com/liveABC'},{mode:'test',checkoutUrl:'https://evil.test/test_abc'},{mode:'test',checkoutUrl:'https://buy.stripe.com/test_abc?redirect=evil'}]){
 const nodes=await billing(config);assert.equal(nodes['test-checkout'].hidden,true);assert.equal(nodes['test-checkout'].href,undefined);
 }
});
test('valid hosted test link is enabled with explicit test-only messaging',async()=>{
 const nodes=await billing({mode:'test',checkoutUrl:'https://buy.stripe.com/test_abc123'});
 assert.equal(nodes['test-checkout'].hidden,false);assert.match(nodes['billing-status'].textContent,/test checkout only/);
 nodes.preferences.events.change();assert.match(nodes['preference-summary'].textContent,/HVAC, Electrical/);assert.match(nodes['preference-summary'].textContent,/preview/);
});
test('home has no direct payment links and pages distinguish unsubscribe from cancellation',()=>{
 const home=fs.readFileSync('index.html','utf8');assert.doesNotMatch(home,/https:\/\/buy\.stripe\.com/);
 assert.match(home,/start\.html/);assert.match(fs.readFileSync('manage.html','utf8'),/Unsubscribing from emails does not cancel billing/);
});
