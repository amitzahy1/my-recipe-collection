export const CATEGORIES=['הכול','בשר','עוף','מאפים ולחמים','פסטה ואטריות','סלטים וירקות','קינוחים','מרקים','ראמן','ממרחים','אחר'];
export const uid=()=>globalThis.crypto?.randomUUID?.()||'r-'+Date.now()+'-'+Math.random().toString(36).slice(2);
export const lines=s=>String(s||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
export const normalize=s=>String(s||'').normalize('NFKC').replace(/[\u0591-\u05C7]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function safeURL(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
export function classify(text){
 const t=normalize(text);
 const groups=[
  ['קינוחים',/עוגה|עוגת|קינוח|שוקולד|עוגיות|טירמיסו|קראמבל|קראנץ|מוס|בראוניז|פאי|טארט|גלידה|cake|dessert|tiramisu|crumble/],
  ['מאפים ולחמים',/פוקצ|לחם|חלה|פיצה|בצק|בייגל|פידה|סמבוסק|בורקס|פשטיד|מאפה|קيش|פנקייק|לחמני|focaccia|bread|bagel|pizza/],
  ['מרקים',/מרק|ראמן|חרירה|גולאש|soup|ramen/],
  ['עוף',/פרגית|פרגיות|עוף|כרעיים|שניצל|חזה עוף|כנפיים|chicken/],
  ['בשר',/בשר|בקר|דנבר|אונטריב|רוסטביף|סטייק|אסאדו|שפונדרה|שייטל|קבב|שווארמה|טבית|קובה|טלה|כבש|אנטריקוט|סינטה|beef|steak/],
  ['פסטה ואטריות',/פסטה|ניוקי|אטריות|ספגטי|בוקטיני|ריגטוני|פנה|רביולי|טורטליני|לזניה|קאצ ו|נודי|gnudi|ריזוטו|pasta|noodles|risotto/],
  ['סלטים וירקות',/סלט|חציל|ירקות|כרובית|ברוקולי|זוקיני|קישוא|לביבות|בורגול|קולסלאו|salad/]
 ];
 return groups.find(([,re])=>re.test(t))?.[0]||'אחר';
}
function cleanHeadingLine(line){
 return String(line||'')
  .replace(/^[\s#*•●\-–—🛒👨‍🍳💡📝✨🔥🥣🥗🍖🍰🥘🍲🍕🍝]+/u,'')
  .replace(/\s*\([^)]*\)\s*/g,' ')
  .replace(/[\s*:：\-–—]+$/g,'')
  .trim();
}
export function parseText(raw,title=''){
 const ls=lines(raw), first=ls[0]||'';
 const heading=/^(?:רשימת\s+)?(?:מצרכים|מרכיבים|חומרים|המרכיבים|המצרכים|ingredients|אופן\s*ההכנה|הוראות\s*ההכנה|הוראות\s*הכנה|הכנה|שלבי\s*ההכנה|שלבי\s*הכנה|instructions|directions|method|טיפים|הערות|דגשים(?:\s+חשובים)?|tips|notes)$/i;
 const isHeading=l=>heading.test(cleanHeadingLine(l));
 if(!title&&!isHeading(first)&&!/^https?:\/\//.test(first)){
  const candidate=first.replace(/^#+\s*/,'').replace(/^\*\*(.*)\*\*$/,'$1').trim();
  title=candidate.length<110?(ls.shift(),candidate):'';
 }
 let section='raw';const ingredients=[],steps=[],tips=[],unassigned=[];
 for(const l of ls){
  if(isHeading(l)){
   const h=cleanHeadingLine(l);
   section=/מצרכים|מרכיבים|חומרים|ingredients/i.test(h)?'ingredients':/טיפים|הערות|דגשים|tips|notes/i.test(h)?'tips':'steps';
   continue;
  }
  const clean=l.replace(/^[•●*\-]\s*/,'').replace(/^\d+[.)]\s+/,'').replace(/\*\*(.*?)\*\*/g,'$1').trim();
  if(!clean)continue;
  if(section==='ingredients')ingredients.push(clean);else if(section==='steps')steps.push(clean);else if(section==='tips')tips.push(clean);else unassigned.push(l);
 }
 const servingsMatch=String(raw||'').match(/(?:מספר\s*מנות|מנות|servings|serves)\s*[:：]\s*(\d{1,3})/i)||String(raw||'').match(/(?:ל[-־\s]?)?(\d{1,3})\s*מנות(?:\s|$)/);
 return {servings:servingsMatch?Number(servingsMatch[1]):undefined,servingsKnown:!!servingsMatch,title:title||'מתכון חדש',category:classify([title,raw].join(' ')),ingredients,steps,tips,description:unassigned.filter(l=>!/^https?:\/\//.test(l)).slice(0,2).join(' ').slice(0,300),raw:String(raw||''),sourceUrl:safeURL(String(raw||'').match(/https?:\/\/[^\s<>]+/)?.[0]||''),needsReview:true};
}
export function normalizeRecipe(r={}){
 const arr=x=>Array.isArray(x)?x.map(String).filter(Boolean):lines(x);
 const category=CATEGORIES.includes(r.category)&&r.category!=='הכול'?r.category:'אחר';
 return {id:typeof r.id==='string'?r.id:uid(),title:String(r.title||'מתכון ללא שם').slice(0,200),category,description:String(r.description||''),ingredients:arr(r.ingredients),steps:arr(r.steps),tips:arr(r.tips),notes:String(r.notes||''),raw:String(r.raw||''),sourceMeta:String(r.sourceMeta||''),sourceUrl:safeURL(r.sourceUrl),sourceName:String(r.sourceName||''),rating:Math.max(0,Math.min(5,Math.round(Number(r.rating)||0))),imageOrigin:['source','uploaded','ai'].includes(r.imageOrigin)?r.imageOrigin:(r.image?'source':''),review:r.review&&typeof r.review==='object'?r.review:null,history:Array.isArray(r.history)?r.history.slice(-5):[],sharedRef:r.sharedRef&&typeof r.sharedRef==='object'?r.sharedRef:null,image:typeof r.image==='string'&&(/^(data:image\/(jpeg|png|webp|gif);base64,|\.\/assets\/)/.test(r.image)||safeURL(r.image))?r.image:'',servings:Math.max(1,Math.min(1000,Number(r.servings)||4)),servingsKnown:typeof r.servingsKnown==='boolean'?r.servingsKnown:Number(r.servings)>0,minutes:Math.max(0,Math.min(100000,Number(r.minutes)||0)),tags:arr(r.tags).slice(0,40),favorite:!!r.favorite,demo:!!r.demo,needsReview:!!r.needsReview,createdAt:Number(r.createdAt)||Date.now(),addedAt:Number(r.addedAt)||Number(r.createdAt)||Date.now(),updatedAt:Number(r.updatedAt)||Date.now(),cookedCount:Math.max(0,Number(r.cookedCount)||0)};
}
export function keepToRecipe(note,filename=''){
 if(!note||typeof note!=='object'||Array.isArray(note)||!('textContent'in note||'listContent'in note||'title'in note||'text'in note))return null;
 if(note.isTrashed||note.trashed)return null;
 const rawList=Array.isArray(note.listContent)?note.listContent:Array.isArray(note.listContent?.listItems)?note.listContent.listItems:[];
 const list=rawList.map(x=>String(x?.text||x?.textContent||'')).filter(Boolean).join('\n');
 const textBody=note.textContent||note.text?.text||'';
 const raw=[textBody,list].filter(Boolean).join('\n');
 const labels=(note.labels||[]).map(x=>typeof x==='string'?x:x?.name).filter(Boolean);
 const createdMs=Number(note.createdTimestampUsec)/1000||(note.createTime?Date.parse(note.createTime):0)||Date.now();
 const updatedMs=Number(note.userEditedTimestampUsec)/1000||(note.updateTime?Date.parse(note.updateTime):0)||createdMs;
 return normalizeRecipe({...parseText(raw,String(note.title||filename.replace(/\.json$/i,''))),tags:labels,sourceName:'Google Keep',createdAt:createdMs,updatedAt:updatedMs,raw});
}
export function fingerprint(r){return normalize(r.title)+'|'+normalize(r.raw||[...r.ingredients,...r.steps].join('\n'));}
export function deduplicate(incoming,existing){const seen=new Set(existing.map(fingerprint));let duplicates=0;const recipes=[];for(const r of incoming){const f=fingerprint(r);if(seen.has(f)){duplicates++;continue;}seen.add(f);recipes.push(r);}return {recipes,duplicates};}
const FRACTIONS={'½':.5,'⅓':1/3,'⅔':2/3,'¼':.25,'¾':.75,'⅛':.125,'⅜':.375,'⅝':.625,'⅞':.875};
export function scaleIngredient(line,factor){
 if(factor===1)return line;
 // Only unambiguous leading quantities. Ranges, sizes, temperatures and vague units stay intact.
 const match=String(line).match(/^(\d+\s+\d+\/\d+|\d+\s*[½⅓⅔¼¾⅛⅜⅝⅞]|\d+\/\d+|\d+(?:[.,]\d+)?|[½⅓⅔¼¾⅛⅜⅝⅞])(?=\s|[א-תA-Za-z])/);
 if(!match)return line;
 const rest=line.slice(match[0].length);
 if(/^\s*[-–־/]|^\s*(?:מעלות|°|ס[״"]?מ|cm|mm)/i.test(rest))return line;
 const s=match[0].trim();let n;
 if(/[½⅓⅔¼¾⅛⅜⅝⅞]/.test(s)){const f=s.at(-1);n=(parseFloat(s.slice(0,-1))||0)+FRACTIONS[f];}
 else if(s.includes('/')){const chunks=s.split(/\s+/);const [a,b]=chunks.pop().split('/').map(Number);if(!b)return line;n=(Number(chunks[0])||0)+a/b;}
 else n=Number(s.replace(',','.'));
 if(!Number.isFinite(n))return line;
 return (Math.round(n*factor*100)/100).toLocaleString('he-IL',{maximumFractionDigits:2})+rest;
}
export function recipeText(r,servings=r.servings){return [r.title,r.description,'',...(r.servingsKnown?[`מנות: ${servings}`]:[]),...(r.minutes?[`זמן כולל: ${r.minutes} דקות`]:[]),'','מצרכים',...r.ingredients.map(x=>scaleIngredient(x,servings/r.servings)),'','אופן ההכנה',...r.steps.map((s,i)=>`${i+1}. ${s}`),...(r.tips.length?['','טיפים',...r.tips]:[]),...(r.notes?['','ההערות שלי',r.notes]:[]),...(r.sourceUrl?['','מקור: '+r.sourceUrl]:[])].join('\n');}
export function parseBackup(data){if(!data||data.app!=='matkon'||data.version!==1||!Array.isArray(data.recipes))throw new Error('זה אינו גיבוי נתמך של My Recipe Collection');return data.recipes.map(normalizeRecipe);}
