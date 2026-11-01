import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {basicReview,smartSearch,recipeFromJSONLD} from '../public/intelligence.js';
import {normalizeRecipe} from '../public/core.js';
import {handleAPI,publicURL} from '../server/api.js';

let NativeDatabaseSync=null;
try{({DatabaseSync:NativeDatabaseSync}=await import('node:sqlite'));}catch{}

class PythonSqliteSync{
 constructor(){
  this.dir=mkdtempSync(join(tmpdir(),'matkon-d1-'));
  this.file=join(this.dir,'db.sqlite');
 }
 _run(mode,sql,params=[]){
  const out=execFileSync('python3',['-c',`
import sqlite3, json, sys
db_path, mode, sql, params_json = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
params = json.loads(params_json)
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
if mode == 'exec':
    conn.executescript(sql)
    conn.commit()
    print(json.dumps({"ok": True}))
elif mode == 'all':
    cur.execute(sql, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.commit()
    print(json.dumps(rows))
elif mode == 'get':
    cur.execute(sql, params)
    row = cur.fetchone()
    conn.commit()
    print(json.dumps(dict(row) if row else None))
elif mode == 'run':
    cur.execute(sql, params)
    conn.commit()
    print(json.dumps({"changes": conn.total_changes}))
conn.close()
`,this.file,mode,sql,JSON.stringify(params)],{encoding:'utf8'});
  return JSON.parse(out);
 }
 exec(sql){if(/^(BEGIN|COMMIT|ROLLBACK)$/i.test(sql.trim()))return;this._run('exec',sql);}
 prepare(sql){
  return {
   all:(...params)=>this._run('all',sql,params),
   get:(...params)=>this._run('get',sql,params),
   run:(...params)=>this._run('run',sql,params)
  };
 }
}

test('smart local search recognizes time, exclusions and chicken aliases',()=>{
 const recipes=[{title:'פרגיות בסויה',minutes:35,ingredients:['800 גרם פרגיות'],tags:[],category:'עוף',description:''},{title:'פרגיות ופטריות',minutes:30,ingredients:['פרגיות','פטריות'],tags:[],category:'עוף',description:''},{title:'עוף איטי',minutes:80,ingredients:['עוף'],tags:[],category:'עוף',description:''}];
 const result=smartSearch(recipes,'עוף בלי פטריות עד 40 דקות');assert.deepEqual(result.recipes.map(r=>r.title),['פרגיות בסויה']);assert.equal(result.filters.maxMinutes,40);
});
test('structured recipe import preserves source image and does not invent missing servings',()=>{
 const html='<script type="application/ld+json">'+JSON.stringify({'@graph':[{'@type':'Recipe',name:'פוקצ׳ה',description:'לחם &amp; שמן זית',image:[{url:'/photo.jpg'}],recipeIngredient:['500 גרם קמח','350 מ״ל מים'],recipeInstructions:[{'@type':'HowToSection',itemListElement:[{text:'לשים'},{text:'אופים'}]}],totalTime:'PT1H20M',recipeYield:'תבנית אחת'}]})+'</script>';
 const r=recipeFromJSONLD(html,'https://recipes.example/focaccia');assert.equal(r.image,'https://recipes.example/photo.jpg');assert.equal(r.minutes,80);assert.equal(r.servingsKnown,false);assert.equal(r.steps.length,2);assert.equal(r.category,'מאפים ולחמים');assert.equal(r.description,'לחם & שמן זית');
 const noImage=recipeFromJSONLD('<script type="application/ld+json">{"@type":"Recipe","name":"ללא תמונה"}</script>','https://recipes.example/r');assert.equal(noImage.image,'');assert.equal(recipeFromJSONLD('<script>bad</script>','https://recipes.example'),null);
});
test('basic review is explicitly rules-based and points out missing structure',()=>{
 const review=basicReview(normalizeRecipe({title:'עוגה',steps:['אופים בתנור']}));assert.equal(review.type,'basic');assert.ok(review.issues.some(x=>x.title.includes('טמפרטורת')));assert.ok(review.issues.some(x=>x.title.includes('מצרכים')));assert.match(review.limitations,/לא ניתוח AI/);
});
class D1Fixture{
 constructor(){this.db=NativeDatabaseSync?new NativeDatabaseSync(':memory:'):new PythonSqliteSync();const sql=readFileSync(new URL('../drizzle/0000_bouncy_king_cobra.sql',import.meta.url),'utf8');this.db.exec(sql);}
 prepare(sql){const db=this.db;return {bind(...params){return {async all(){return {results:db.prepare(sql).all(...params)};},async first(){return db.prepare(sql).get(...params)||null;},async run(){return {meta:db.prepare(sql).run(...params)};}};}};}
 async batch(stmts){this.db.exec('BEGIN');try{const results=[];for(const s of stmts)results.push(await s.run());this.db.exec('COMMIT');return results;}catch(err){this.db.exec('ROLLBACK');throw err;}}
}
function request(path,body,user='owner'){return new Request('https://app.example/api/'+path,{method:body?'POST':'GET',headers:{...(user?{'oai-authenticated-user-id':user}:{}),...(body?{Origin:'https://app.example','Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});}
test('shared collections, following, ratings and ownership are persisted with private notes removed',async()=>{
 const env={DB:new D1Fixture()};const recipe=normalizeRecipe({id:'recipe-1',title:'מרק',notes:'PRIVATE NOTE',raw:'PRIVATE RAW',ingredients:['מים'],steps:['מבשלים'],servings:2,rating:5});
 const published=await handleAPI(request('collections',{id:'collection-1',title:'משפחתי',ownerName:'עמית',recipes:[recipe]}),env);assert.equal(published.status,200);const p=await published.json();assert.equal(p.count,1);
 const viewed=await (await handleAPI(request('collections/'+p.token,undefined,'friend'),env)).json();assert.equal(viewed.recipes[0].notes,'');assert.equal(viewed.recipes[0].raw,'');assert.equal(viewed.recipes[0].rating,0);
 assert.equal((await handleAPI(request('collections',{id:'collection-1',title:'hijack',recipes:[recipe]},'friend'),env)).status,403);
 assert.equal((await handleAPI(request('subscribe',{token:p.token},'friend'),env)).status,200);const lists=await (await handleAPI(request('collections',undefined,'friend'),env)).json();assert.equal(lists.following.length,1);
 const rated=await (await handleAPI(request('ratings',{token:p.token,recipeId:'recipe-1',score:4},'friend'),env)).json();assert.equal(rated.average,4);assert.equal(rated.count,1);
 await handleAPI(request('ratings',{token:p.token,recipeId:'recipe-1',score:5},'friend'),env);const updated=await (await handleAPI(request('collections/'+p.token,undefined,'friend'),env)).json();assert.equal(updated.recipes[0].communityRating.average,5);assert.equal(updated.recipes[0].communityRating.count,1);
 assert.equal((await handleAPI(request('collections',undefined,null),env)).status,401);
 const foreign=new Request('https://app.example/api/subscribe',{method:'POST',headers:{Origin:'https://evil.example','oai-authenticated-user-id':'friend'},body:'{}'});assert.equal((await handleAPI(foreign,env)).status,403);
});
test('URL import rejects local addresses and AI stays deferred',async()=>{
 for(const url of ['http://example.com','https://127.0.0.1','https://localhost','https://metadata.internal','https://[::1]','https://user:password@example.com'])assert.throws(()=>publicURL(url));
 assert.equal(publicURL('https://recipes.example/page').hostname,'recipes.example');const cap=await (await handleAPI(request('capabilities'),{})).json();assert.equal(cap.ai,false);
});
