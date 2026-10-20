// tools/subset-fonts.js
// 字体子集化：当站点文案（data/、i18n、页面）更新了新的汉字后，需要重新生成字体子集。
// 用法：
//   1. 准备一个依赖目录：mkdir %TEMP%\fontsubset && cd %TEMP%\fontsubset && npm init -y && npm i subset-font
//   2. 在本文件所在仓库根目录执行：node tools/subset-fonts.js
//   3. 输出覆盖 fonts/*.woff2，确认无误后即可提交（原始 ttf 不需要入库）。

const fs = require('fs');
const path = require('path');
const subsetFont = require(process.env.TEMP + '\\fontsubset\\node_modules\\subset-font');

const ROOT = path.join(__dirname, '..');
const exts = ['.md', '.json', '.html', '.js', '.css'];
const skipDirs = new Set(['node_modules', '.git', 'lib', 'fonts']);

let text = '';
function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        const st = fs.statSync(p);
        if (st.isDirectory()) {
            if (skipDirs.has(f)) continue;
            walk(p);
        } else if (exts.includes(path.extname(f).toLowerCase())) {
            text += fs.readFileSync(p, 'utf8');
        }
    }
}
walk(ROOT);

let ascii = '';
for (let i = 32; i < 127; i++) ascii += String.fromCharCode(i);
ascii += '—–…·「」『』（）、。，；：？！《》〈〉【】〜';

const chars = [...new Set((text + ascii).split(''))].join('');
console.log('unique chars:', chars.length);

const jobs = [
    ['NotoSerifSC.ttf', 'NotoSerifSC.woff2'],
    ['NotoSansSC.ttf', 'NotoSansSC.woff2'],
    ['Inter.ttf', 'Inter.woff2'],
];

(async () => {
    for (const [src, dst] of jobs) {
        const srcPath = path.join(ROOT, 'fonts', src);
        if (!fs.existsSync(srcPath)) {
            console.log(src, '不存在，跳过（请先从 google/fonts 下载可变字重 ttf 放入 fonts/）');
            continue;
        }
        const buf = fs.readFileSync(srcPath);
        const out = await subsetFont(buf, chars, { targetFormat: 'woff2' });
        fs.writeFileSync(path.join(ROOT, 'fonts', dst), out);
        console.log(dst, (out.length / 1024).toFixed(1) + ' KB');
    }
})().catch(e => { console.error(e); process.exit(1); });
