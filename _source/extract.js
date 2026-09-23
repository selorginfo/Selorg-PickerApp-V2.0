const fs = require('fs');
const html = fs.readFileSync('_source/Selorg Picker Pro (Standalone).html','utf8');
function grab(type){
  const open = `<script type="__bundler/${type}">`;
  const i = html.indexOf(open);
  if (i<0) return null;
  const start = i + open.length;
  const end = html.indexOf('</script>', start);
  return html.slice(start, end);
}
fs.mkdirSync('_source/extracted', {recursive:true});
const manifestRaw = grab('manifest');
const templateRaw = grab('template');
const extRaw = grab('ext_resources');
const pageOrderRaw = grab('page_order');
console.log('lens', {manifest:manifestRaw&&manifestRaw.length, template:templateRaw&&templateRaw.length, ext:extRaw&&extRaw.length, pageOrder:pageOrderRaw});
const manifest = JSON.parse(manifestRaw);
const template = JSON.parse(templateRaw);
fs.writeFileSync('_source/extracted/template.html', typeof template==='string'?template:JSON.stringify(template,null,2));
console.log('template type', typeof template, 'len', (typeof template==='string'?template.length:JSON.stringify(template).length));
console.log('manifest type', Array.isArray(manifest)?'array len '+manifest.length:typeof manifest);
if (Array.isArray(manifest)) {
  manifest.forEach((e,idx)=>{
    const keys = Object.keys(e);
    console.log(idx, JSON.stringify(Object.fromEntries(keys.map(k=> [k, k==='data'? '['+String(e[k]).length+' chars]' : e[k]]))).slice(0,200));
  });
} else {
  console.log('manifest keys', Object.keys(manifest));
}
