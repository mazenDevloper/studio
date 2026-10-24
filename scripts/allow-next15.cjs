// OpenNext refuses to build Next.js 15 since its two-year support window ended (21 Oct 2026). The site still runs on
// 15.5.x until it moves to Next 16, so the check is skipped here (this runs after every install, also on Cloudflare).
const fs = require('fs'), path = require('path');
const f = path.join(__dirname, '..', 'node_modules', '@opennextjs', 'aws', 'dist', 'build', 'helper.js');
try {
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes('/* madar: next15 allowed */')) {
    s = s.replace('export function isNextVersionSupported(version) {', 'export function isNextVersionSupported(version) {\n    /* madar: next15 allowed */ if (/^15\\./.test(version)) return true;');
    fs.writeFileSync(f, s); console.log('allow-next15: patched');
  }
} catch (e) { console.log('allow-next15: skipped (' + e.message + ')'); }
