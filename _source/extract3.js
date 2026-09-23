const fs = require('fs'); const zlib = require('zlib');
const html = fs.readFileSync('_source/Selorg Picker Pro (Standalone).html','utf8');
function grab(type){const open=`<script type="__bundler/${type}">`;const i=html.indexOf(open);const s=i+open.length;return html.slice(s, html.indexOf('</script>',s));}
const manifest = JSON.parse(grab('manifest'));
let template = JSON.parse(grab('template'));
fs.mkdirSync('_source/extracted/assets',{recursive:true});
const map = {};
for (const [uuid,e] of Object.entries(manifest)) {
  let bytes = Buffer.from(e.data,'base64');
  if (e.compressed) { try { bytes = zlib.gunzipSync(bytes); } catch(err){ try{ bytes=zlib.inflateSync(bytes);}catch(e2){ console.log('decomp fail',uuid);} } }
  const mime = e.mime||'';
  let ext = ({'image/jpeg':'jpg','image/png':'png','text/javascript':'js','image/svg+xml':'svg','font/woff2':'woff2','text/css':'css','application/json':'json'})[mime] || 'bin';
  const fn = `${uuid}.${ext}`;
  fs.writeFileSync(`_source/extracted/assets/${fn}`, bytes);
  map[uuid] = fn;
  console.log(uuid, mime, e.compressed?'(gz)':'', bytes.length);
}
// rewrite template references
let t = template;
for (const [uuid,fn] of Object.entries(map)) t = t.split(uuid).join('assets/'+fn);
fs.writeFileSync('_source/extracted/template.html', t);
console.log('template written', t.length);
