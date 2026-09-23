const fs = require('fs');
const html = fs.readFileSync('_source/Selorg Picker Pro (Standalone).html','utf8');
function grab(type){
  const open = `<script type="__bundler/${type}">`;
  const i = html.indexOf(open); const start = i + open.length;
  const end = html.indexOf('</script>', start);
  return html.slice(start, end);
}
const manifest = JSON.parse(grab('manifest'));
let template = grab('template'); template = JSON.parse(template);
fs.mkdirSync('_source/extracted/assets', {recursive:true});
for (const [uuid, e] of Object.entries(manifest)) {
  const mime = e.mime || e.type || '';
  const ext = mime.split('/')[1] ? mime.split('/')[1].split(';')[0] : 'bin';
  const meta = {uuid, mime, keys:Object.keys(e), dataLen: (e.data||'').length, path:e.path, name:e.name, url:e.url};
  console.log(JSON.stringify(meta));
  if (e.data && e.encoding !== 'utf8' && !mime.startsWith('text') && mime!=='image/svg+xml') {
    fs.writeFileSync(`_source/extracted/assets/${uuid}.${ext}`, Buffer.from(e.data,'base64'));
  } else if (e.data) {
    fs.writeFileSync(`_source/extracted/assets/${uuid}.${ext}.txt`, e.data.slice(0,2000));
  }
}
// Now substitute uuids in template with asset filenames for readability
let out = template;
fs.writeFileSync('_source/extracted/template.html', out);
console.log('TEMPLATE FIRST 3000:\n', out.slice(0,3000));
