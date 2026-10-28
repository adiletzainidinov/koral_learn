import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';
function loadTypescript(name){const filename=path.resolve(name);const m=new Module(filename);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);return m.exports;}
const {translate,localizeUI}=loadTypescript('src/shared/i18n/translate.ts');
const catalog=JSON.parse(fs.readFileSync(new URL('../src/shared/i18n/ky.json',import.meta.url),'utf8'));

test('every Kyrgyz message preserves all interpolation slots',()=>{
 for(const [source,target]of Object.entries(catalog))assert.deepEqual((source.match(/\{\d+\}/g)||[]).sort(),(target.match(/\{\d+\}/g)||[]).sort(),source);
});
test('Russian labels, custom content and the chosen group names remain stable',()=>{
 for(const text of ['Ученики','Муслимсаани','Тажвид','Куран','Маматова Жылдыз'])assert.equal(translate(text,'ru'),text);
 assert.equal(translate('Аты: Адилет, өзүмдүн эскертмем','ky'),'Аты: Адилет, өзүмдүн эскертмем');
});
test('dynamic messages reorder values without translating inserted names',()=>{
 assert.equal(translate('3 из 8','ky'),'8 ичинен 3');
 assert.equal(translate('Удалить: Мама','ky'),'Өчүрүү: Мама');
 assert.equal(translate('Түзөтүү: Мама','ru'),'Редактировать: Мама');
 assert.equal(translate('  Ученики ','ky'),'  Окуучулар ');
});
test('localizing a UI definition preserves identifiers, values and the source object',()=>{
 const source={id:'present',value:'Присутствовал',label:'Присутствовал',items:['Ученики','Задания'],icon:()=>null};
 const ky=localizeUI(source,'ky');
 assert.equal(ky.label,'Келди');assert.equal(ky.value,source.value);assert.equal(ky.id,source.id);assert.equal(ky.icon,source.icon);assert.deepEqual(ky.items,['Окуучулар','Тапшырмалар']);assert.equal(source.label,'Присутствовал');
});
test('locale store persists the selection, synchronizes tabs and survives unavailable storage',()=>{
 const previousWindow=global.window,previousStorage=global.localStorage;
 const target=new EventTarget(),data=new Map();global.window=target;global.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 try{const store=loadTypescript('src/shared/i18n/locale-store.ts');let notifications=0;const unsubscribe=store.subscribeLocale(()=>notifications++);assert.equal(store.getLocale(),'ru');store.setLocale('ky');assert.equal(store.getLocale(),'ky');assert.equal(data.get('quranlearn-language'),'ky');data.set('quranlearn-language','ru');const event=new Event('storage');Object.defineProperty(event,'key',{value:'quranlearn-language'});target.dispatchEvent(event);assert.equal(store.getLocale(),'ru');assert.equal(notifications,2);global.localStorage.setItem=()=>{throw Error('blocked')};store.setLocale('ky');assert.equal(store.getLocale(),'ky');unsubscribe();}finally{global.window=previousWindow;global.localStorage=previousStorage;}
});

const { formatLocalizedDate, formatKyrgyzRelative } = loadTypescript('src/shared/i18n/date-format.ts');
test('Kyrgyz dates and relative time work without browser ICU language support',()=>{
 assert.equal(formatLocalizedDate(new Date(2026,9,27),{day:'numeric',month:'short',year:'numeric'},'ky'),'27 окт. 2026-ж.');
 assert.equal(formatKyrgyzRelative(new Date('2026-10-20T12:00:00Z'),new Date('2026-10-27T12:00:00Z')),'1 жума мурун');
});
