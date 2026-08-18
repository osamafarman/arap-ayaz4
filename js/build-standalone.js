/* =========================================================================
   build-standalone.js — يجمع محوّل الليرة في ملف واحد

   المخرجات:
     node js/build-standalone.js
         → currency-standalone.html : صفحة كاملة بملف واحد (للإرسال عبر
           واتساب مثلًا، تُفتح بالنقر المزدوج وتعمل بلا إنترنت).

     node js/build-standalone.js --fragment <مسار>
         → نفس المحتوى بلا وسوم <html>/<head>/<body> (للنشر كصفحة مستضافة).

   المصدر الوحيد للحقيقة يبقى currency.html + css/currency.css + js/*،
   فلا يوجد تكرار يدوي للشيفرة.
   ========================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('currency.html');
const css = read('css/currency.css');
const core = read('js/currency-core.js');
const app = read('js/currency-app.js');

function between(source, open, close, label) {
  const a = source.indexOf(open);
  const b = source.indexOf(close, a);
  if (a < 0 || b < 0) throw new Error('تعذّر العثور على ' + label + ' في currency.html');
  return source.slice(a + open.length, b);
}

const title = between(html, '<title>', '</title>', 'العنوان').trim();
const fontLink = (html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/) || [''])[0];

let body = between(html, '<body>', '</body>', 'المحتوى')
  /* روابط الملفات الخارجية وتسجيل خدمة العمل خارج الشبكة لا معنى لها في ملف واحد */
  .replace(/\s*<script src="js\/[^"]+"><\/script>/g, '')
  .replace(/\s*<!--[^>]*-->\s*<script>[\s\S]*?serviceWorker[\s\S]*?<\/script>/g, '')
  .replace(/\s*<script>[\s\S]*?serviceWorker[\s\S]*?<\/script>/g, '')
  .trim();

if (/<script/.test(body)) throw new Error('بقي وسم <script> غير متوقّع في المحتوى');

const parts = {
  title: '<title>' + title + '</title>',
  fonts: fontLink,
  style: '<style>\n' + css.trim() + '\n</style>',
  body: body,
  script: '<script>\n' + core.trim() + '\n\n' + app.trim() + '\n</script>'
};

const fragmentIndex = process.argv.indexOf('--fragment');
if (fragmentIndex > -1) {
  const out = process.argv[fragmentIndex + 1];
  if (!out) throw new Error('حدّد مسار ملف المخرجات بعد --fragment');
  fs.writeFileSync(out,
    [parts.title, parts.fonts, parts.style, parts.body, parts.script].join('\n\n') + '\n');
  console.log('كُتب المقطع في ' + out);
} else {
  const out = path.join(root, 'currency-standalone.html');
  fs.writeFileSync(out, [
    '<!DOCTYPE html>',
    '<html lang="ar" dir="rtl">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
    parts.title,
    '<meta name="theme-color" content="#0d5a45" />',
    '<link rel="icon" href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>💵</text></svg>" />',
    parts.fonts,
    parts.style,
    '</head>',
    '<body>',
    parts.body,
    parts.script,
    '</body>',
    '</html>',
    ''
  ].join('\n'));
  console.log('كُتب الملف الواحد في ' + path.relative(root, out) +
              ' (' + Math.round(fs.statSync(out).size / 1024) + ' ك.ب)');
}
