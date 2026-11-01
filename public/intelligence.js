import {normalize,normalizeRecipe,classify,safeURL,uid} from './core.js';

export function basicReview(recipe){
 const r=normalizeRecipe(recipe),issues=[];
 const add=(severity,title,detail)=>issues.push({id:uid(),severity,title,detail});
 if(!r.ingredients.length)add('missing','רשימת המצרכים חסרה','יש להוסיף מצרכים וכמויות לפני שאפשר לבדוק את היחסים במתכון.');
 if(!r.steps.length)add('missing','שלבי ההכנה חסרים','הטקסט המקורי נשמר. כדאי לחלק את ההכנה לשלבים ברורים.');
 if(!r.servingsKnown)add('missing','לא צוין לכמה מנות המתכון','השלמת הנתון תאפשר שינוי כמויות בלי לנחש.');
 if(!r.minutes)add('improvement','לא הוזן זמן כולל','אפשר לציין בנפרד בתיאור זמן עבודה, בישול והמתנה.');
 const seen=new Set();for(const ingredient of r.ingredients){const n=normalize(ingredient);if(seen.has(n))add('possible','מצרך שמופיע פעמיים',`״${ingredient}״ מופיע יותר מפעם אחת. ייתכן שמדובר בשני חלקים שונים של המתכון — כדאי להבהיר.`);seen.add(n);}
 const method=r.steps.join(' ');
 if(/תנור|אופים|לאפות|bake|oven/i.test(method)&&!/[1-3]\d{2}\s*(?:°|מעלות|C\b|F\b)|(?:temperature|תנור)\s*[:=]?\s*[1-3]\d{2}/i.test(method))add('missing','לא מצאתי טמפרטורת תנור בשלבים','אם יש אפייה, כדאי לציין טמפרטורה וסוג חימום. זו בדיקה בסיסית; בדוק גם בטקסט המקורי.');
 if(r.steps.length&&!/דק|שעה|שעות|minute|hour|מוכן|זהוב|רך|משחים|מזלג|מדחום|צבע|קיסם|עד\s/i.test(method))add('improvement','אפשר להבהיר מתי מסיימים','מומלץ לציין זמן משוער וגם סימן חזותי או מרקם שמראים שהשלב הסתיים.');
 if(!r.image)add('improvement','אין תמונה למתכון','אפשר להוסיף צילום, לשמור תמונה מהמקור או ליצור תמונת המחשה ב־AI.');
 return {type:'basic',reviewedAt:Date.now(),summary:issues.length?'נקודות שכדאי לבדוק לפני הבישול':'לא נמצאו חוסרים בבדיקת המבנה הבסיסית.',issues,questions:[],changes:[],limitations:'זו בדיקת מבנה לפי כללים, לא ניתוח AI ולא אימות מקצועי של המתכון.'};
}
const aliases={עוף:['עוף','פרגיות','פרגית','chicken'],בשר:['בשר','בקר','אונטריב','דנבר','beef'],פסטה:['פסטה','ניוקי','אטריות','pasta'],קינוח:['עוגה','עוגת','קינוח','עוגיות','שוקולד'],לחם:['לחם','פוקצ','חלה','מאפים'],צמחוני:['צמחוני','ירקות','סלט']};
export function smartSearch(recipes,text){
 let q=normalize(text);const maxMatch=q.match(/עד\s+(\d+)\s*(?:דקות|דק)|under\s+(\d+)\s*min/);let maxMinutes=maxMatch?Number(maxMatch[1]||maxMatch[2]):/מהיר|quick/.test(q)?30:null;
 const exclusions=[];q=q.replace(/(?:בלי|ללא|without)\s+([^\s]+)/g,(_,word)=>{exclusions.push(word);return '';}).replace(/עד\s+\d+\s*(?:דקות|דק)|under\s+\d+\s*min/g,'');
 const stop=new Set(['אני','רוצה','מחפש','מחפשת','משהו','עם','מתכון','מתכונים','של','לי','מהיר','מהירה','להכין','לבשל','לארוחת','ארוחת','ערב','צהריים','בוקר','בפחות','דקות','quick','recipe','with','for','dinner']);
 const terms=q.split(' ').filter(w=>w&&!stop.has(w));
 const synonyms=w=>aliases[w]||[w];
 const hits=recipes.map(r=>{const haystack=normalize([r.title,r.description,r.category,...r.ingredients,...r.tags].join(' '));const excluded=exclusions.some(w=>synonyms(w).some(v=>haystack.includes(normalize(v))));if(excluded||maxMinutes&&(!r.minutes||r.minutes>maxMinutes))return null;const matched=terms.filter(w=>synonyms(w).some(v=>haystack.includes(normalize(v))));if(terms.length&&matched.length!==terms.length)return null;return {recipe:r,score:matched.length*10+(r.favorite?2:0)+(r.rating||0)/5};}).filter(Boolean).sort((a,b)=>b.score-a.score);
 return {recipes:hits.map(x=>x.recipe),filters:{maxMinutes,exclusions,terms},explanation:[maxMinutes?`עד ${maxMinutes} דקות · רק מתכונים שזמנם ידוע`:null,exclusions.length?'ללא '+exclusions.join(', '):null].filter(Boolean).join(' · ')};
}
export function durationMinutes(value){const m=String(value||'').match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);return m?Number(m[1]||0)*1440+Number(m[2]||0)*60+Number(m[3]||0)+Math.ceil(Number(m[4]||0)/60):0;}
export function cleanText(value){return String(value||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>{const c=Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):'';}).replace(/[ \t]+/g,' ').trim();}
function instructionSteps(value){if(typeof value==='string')return value.split(/\n+/).map(cleanText).filter(Boolean);if(Array.isArray(value))return value.flatMap(instructionSteps);if(value&&typeof value==='object')return value.itemListElement?instructionSteps(value.itemListElement):value.text?[cleanText(value.text)]:[];return [];}
export function recipeFromJSONLD(html,sourceUrl){
 const blocks=[...String(html).matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)];
 const nodes=[];let visited=0;function walk(x){if(++visited>3000||!x)return;if(Array.isArray(x)){x.forEach(walk);return;}if(typeof x==='object'){if([].concat(x['@type']||[]).some(t=>String(t).toLowerCase()==='recipe'))nodes.push(x);if(x['@graph'])walk(x['@graph']);if(x.mainEntity)walk(x.mainEntity);if(x.itemListElement)walk(x.itemListElement);if(x.item)walk(x.item);}}
 for(const b of blocks){try{walk(JSON.parse(b[1]));}catch{}}
 const raw=nodes[0];if(!raw)return null;
 let img=[].concat(raw.image||[])[0];if(img&&typeof img==='object')img=img.url||img.contentUrl||img['@id'];try{img=typeof img==='string'&&img.trim()?safeURL(new URL(img,sourceUrl).href):'';}catch{img='';}
 const yieldText=cleanText([].concat(raw.recipeYield||[])[0]);const servingsMatch=yieldText.match(/^(\d+)\s*$|(?:serves|servings|מנות)\s*:?[ ]*(\d+)|(\d+)\s*(?:servings|מנות)/i);const servings=servingsMatch?Number(servingsMatch[1]||servingsMatch[2]||servingsMatch[3]):undefined;
 const ingredients=[].concat(raw.recipeIngredient||[]).map(cleanText).filter(Boolean);const steps=instructionSteps(raw.recipeInstructions);const title=cleanText(raw.name)||'מתכון מהאינטרנט';const sourceName=typeof raw.author==='string'?raw.author:[].concat(raw.author||[])[0]?.name||new URL(sourceUrl).hostname;
 return normalizeRecipe({title,category:classify(title+' '+ingredients.join(' ')),description:cleanText(raw.description),image:img,imageOrigin:img?'source':'',ingredients,steps,sourceName,sourceUrl,servings,servingsKnown:!!servings,minutes:durationMinutes(raw.totalTime)||(durationMinutes(raw.prepTime)+durationMinutes(raw.cookTime)),raw:[title,cleanText(raw.description),'מצרכים',...ingredients,'אופן ההכנה',...steps].join('\n'),tags:[].concat(raw.recipeCategory||[],raw.recipeCuisine||[]).map(cleanText),needsReview:true});
}
export function photoPrompt(r){return `Create a highly realistic food photograph of the finished dish described below, faithful to its ingredients and preparation. ${r.title}. Ingredients: ${r.ingredients.join('; ')}. Method: ${r.steps.join('; ')}. A real home-cooked serving, subtle natural window light, ceramic plate, believable edible textures, gentle imperfections, restrained styling, realistic portions and colors, appetizing candid editorial food photography, 50mm lens, no text, no illustration, no CGI, no plastic shine, no added ingredients or garnish absent from the recipe. The image is an AI-generated illustration, not documentary evidence of this recipe.`;}
