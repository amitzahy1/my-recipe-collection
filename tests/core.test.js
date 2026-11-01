import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseText,keepToRecipe,normalizeRecipe,deduplicate,scaleIngredient,safeURL,parseBackup,recipeText,classify} from '../public/core.js';
import {KEEP_RECIPES} from '../public/keep-recipes.js';

test('Keep text, checklists, labels and microsecond dates survive import',()=>{
 const note={title:'עוגה של אמא',textContent:'מצרכים\n200 גרם קמח\n2 ביצים\nאופן ההכנה\nמערבבים בעדינות\nאופים\nטיפים\nמצננים לפני חיתוך',labels:[{name:'משפחתי'}],createdTimestampUsec:1700000000000000,userEditedTimestampUsec:1700001000000000};
 const r=keepToRecipe(note,'note.json');assert.equal(r.title,note.title);assert.deepEqual(r.ingredients,['200 גרם קמח','2 ביצים']);assert.deepEqual(r.steps,['מערבבים בעדינות','אופים']);assert.deepEqual(r.tips,['מצננים לפני חיתוך']);assert.deepEqual(r.tags,['משפחתי']);assert.equal(r.createdAt,1700000000000);assert.equal(r.raw,note.textContent);assert.equal(r.needsReview,true);
 const checklist=keepToRecipe({title:'רשימת מתכון',listContent:[{text:'שורה אחת',isChecked:true},{text:'שורה שתיים'}]});assert.equal(checklist.raw,'שורה אחת\nשורה שתיים');assert.equal(checklist.ingredients.length,0);
 const apiChecklist=keepToRecipe({title:'מתכון מ-API',listContent:{listItems:[{textContent:'מצרכים'},{textContent:'2 כוסות קמח'}]},createTime:'2026-01-01T10:00:00Z'});
 assert.deepEqual(apiChecklist.ingredients,['2 כוסות קמח']);
 assert.equal(keepToRecipe({...note,isTrashed:true}),null);assert.equal(keepToRecipe({unrelated:'metadata'}),null);
});
test('Markdown, emoji and parenthetical headings from real Keep notes are parsed cleanly',()=>{
 const raw='# **רוסטביף שייטל**\nתיאור קצר של הנתח\n## 🛒 מצרכים (6-8 סועדים):\n* **1.5 ק"ג** שייטל\n* 2 כפיות פלפל שחור\n### 👨‍🍳 שלבי ההכנה:\n1. **צריבה:** צורבים במחבת.\n2. צולים בתנור.\n💡 דגשים חשובים:\n- פורסים דק נגד הסיבים';
 const r=parseText(raw);
 assert.equal(r.title,'רוסטביף שייטל');
 assert.equal(r.category,'בשר');
 assert.deepEqual(r.ingredients,['1.5 ק"ג שייטל','2 כפיות פלפל שחור']);
 assert.deepEqual(r.steps,['צריבה: צורבים במחבת.','צולים בתנור.']);
 assert.deepEqual(r.tips,['פורסים דק נגד הסיבים']);
});
test('all 96 imported Google Keep recipes validate and normalize cleanly',()=>{
 assert.equal(KEEP_RECIPES.length,96);
 const normalized=parseBackup({app:'matkon',version:1,recipes:KEEP_RECIPES});
 assert.equal(normalized.length,96);
 for(const r of normalized){
  assert.ok(r.id.startsWith('keep-') || r.id.startsWith('drive-') || r.id.startsWith('chat-') || r.id.startsWith('chatgpt-'));
  assert.ok(r.title.length>0);
  assert.ok(r.ingredients.length>0,`Missing ingredients in ${r.title}`);
  assert.ok(r.steps.length>0,`Missing steps in ${r.title}`);
  assert.ok(['Google Keep', 'Google Drive', 'שיחות Gemini', 'שיחות ChatGPT'].includes(r.sourceName));
  assert.equal(r.demo,false);
 }
 assert.equal(classify('קאצ\'ו אה פפה'),'פסטה ואטריות');
 assert.equal(classify('אסאדו בבישול ארוך'),'בשר');
 assert.equal(classify('בייגל אמריקאי'),'מאפים ולחמים');
});
test('unknown recipe structure preserves the original without inventing ingredients',()=>{
 const text='תבשיל משפחתי\nמשהו שכתבתי בלי כותרות\nקצת מים, עד שמוכן';const r=parseText(text);assert.equal(r.title,'תבשיל משפחתי');assert.equal(r.raw,text);assert.deepEqual(r.ingredients,[]);assert.deepEqual(r.steps,[]);
});
test('unknown servings stay unknown and are not included in shared text',()=>{
 const unknown=normalizeRecipe(keepToRecipe({title:'מתכון',textContent:'מצרכים\n200 גרם קמח'}));assert.equal(unknown.servingsKnown,false);assert.doesNotMatch(recipeText(unknown),/מנות:/);
 const known=normalizeRecipe(parseText('עוגה\nמנות: 6\nמצרכים\n200 גרם קמח'));assert.equal(known.servingsKnown,true);assert.equal(known.servings,6);
});
test('scaling handles integers, decimals, mixed and Unicode fractions conservatively',()=>{
 for(const [input,factor,expected] of [['500 גרם קמח',.5,'250 גרם קמח'],['1.5 ליטר מים',2,'3 ליטר מים'],['1 1/2 כוסות מים',2,'3 כוסות מים'],['½ כפית מלח',2,'1 כפית מלח'],['1½ כוסות',2,'3 כוסות'],['2 ביצים',1.5,'3 ביצים'],['2-3 כפות',2,'2-3 כפות'],['2–3 כפות',2,'2–3 כפות'],['24 ס״מ תבנית',2,'24 ס״מ תבנית'],['196 מעלות',2,'196 מעלות'],['מלח לפי הטעם',2,'מלח לפי הטעם']])assert.equal(scaleIngredient(input,factor),expected);
});
test('duplicates are skipped both against existing recipes and within a batch',()=>{
 const r=normalizeRecipe({title:'עוגת שוקולד',raw:'200 גרם קמח'});const result=deduplicate([{...r,id:'new'},{...r,id:'new2'},{...r,title:'עוגה אחרת',id:'new3'}],[r]);assert.equal(result.duplicates,2);assert.equal(result.recipes.length,1);
});
test('backup validation and recipe normalization reject dangerous URL/image schemes',()=>{
 assert.equal(safeURL('javascript:alert(1)'),'');assert.equal(safeURL('data:text/html,hello'),'');assert.equal(safeURL('https://example.com/a'),'https://example.com/a');
 const r=normalizeRecipe({title:'<script>text</script>',sourceUrl:'javascript:bad()',image:'data:image/svg+xml;base64,xxx',servings:-10});assert.equal(r.sourceUrl,'');assert.equal(r.image,'');assert.equal(r.servings,1);assert.equal(r.title,'<script>text</script>');
 assert.throws(()=>parseBackup({recipes:[]}),/גיבוי/);assert.throws(()=>parseBackup({app:'matkon',version:2,recipes:[]}),/גיבוי/);assert.equal(parseBackup({app:'matkon',version:1,recipes:[{title:'שלום'}]})[0].title,'שלום');
});
test('text sharing keeps creator source and scales quantities without changing the stored recipe',()=>{
 const r=normalizeRecipe({title:'לחם',servings:4,ingredients:['500 גרם קמח'],steps:['לשים'],sourceUrl:'https://example.com/recipe'});const shared=recipeText(r,8);assert.match(shared,/1000 גרם קמח|1,000 גרם קמח/);assert.match(shared,/https:\/\/example.com\/recipe/);assert.equal(r.ingredients[0],'500 גרם קמח');
});

test('sort select option regression: rating sort does not reference undefined a/b outside sort callback',()=>{
 const appCode=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.doesNotMatch(appCode,/<option value="alpha"[^>]*b\.rating/);
 assert.match(appCode,/<option value="alpha" \$\{sort==='alpha'\?'selected':''\}>לפי א׳–ב׳<\/option>/);
});
