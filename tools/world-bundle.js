'use strict';
/* Bundles src/world/*.js into the concept demo, so the demo and the
 * extension pane run the very same code. Usage: node tools/world-bundle.js */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const order = ['engine', 'assets', 'data', 'state', 'land', 'hq', 'global', 'views'];
const src = order.map(f => fs.readFileSync(path.join(root, 'src', 'world', f + '.js'), 'utf8')).join('\n');
const page = fs.readFileSync(path.join(root, 'concepts', 'nextwork-world', 'demo.src.html'), 'utf8');
if (!page.includes('<!-- WORLD -->')) throw new Error('demo.src.html has no <!-- WORLD --> marker');
const out = page.replace('<!-- WORLD -->', () => '<script>\n' + src.split('</script').join('<\\/script') + '\n</script>');
fs.writeFileSync(path.join(root, 'concepts', 'nextwork-world', 'demo.html'), out);
process.stdout.write('demo.html: ' + out.length + ' bytes from ' + order.length + ' files\n');
