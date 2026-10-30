// tools/subset-fonts.js
// 字体子集化：当站点文案（data/、i18n、页面）更新了新的汉字后，需要重新生成字体子集。
// 用法：
//   1. 准备一个依赖目录：mkdir %TEMP%\fontsubset && cd %TEMP%\fontsubset && npm init -y && npm i subset-font opencc-js
//   2. 在本文件所在仓库根目录执行：node tools/subset-fonts.js
//   3. 输出覆盖 fonts/*.woff2，并自动更新 css/fonts.css 里的「繁体按需子集」块，确认无误后即可提交（原始 ttf 不需要入库）。
//
// 繁体按需子集说明：
//   页面被浏览器翻译/插件（新同文堂等）转成繁体时，繁体字不在简体子集里，会逐字回退到系统黑体，
//   导致衬线标题混入黑体。因此把全站语料用 OpenCC 转繁（台湾用词 twp），取出简体字表之外的字符，
//   单独切成一个小 woff2，以同 family 的第二个 @font-face + unicode-range 挂载：
//   简体页面零命中零下载；只有页面真的出现这些繁体字时浏览器才按需加载。

const fs = require('fs');
const path = require('path');
const subsetFont = require(process.env.TEMP + '\\fontsubset\\node_modules\\subset-font');
const OpenCC = require(process.env.TEMP + '\\fontsubset\\node_modules\\opencc-js');

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

// —— 繁体按需子集字表：转繁后新出现的 CJK 字符 ——
const isCJKish = (ch) => /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(ch);
const simpSet = new Set(chars.split(''));
const tradConverted = OpenCC.Converter({ from: 'cn', to: 'twp' })(text + ascii);
const tradExtra = [...new Set(tradConverted.split('').filter((ch) => !simpSet.has(ch) && isCJKish(ch)))];
console.log('traditional extra chars:', tradExtra.length);

const jobs = [
    ['NotoSerifSC.ttf', 'NotoSerifSC.woff2'],
    ['NotoSansSC.ttf', 'NotoSansSC.woff2'],
    ['Inter.ttf', 'Inter.woff2'],
];

const TC_BEGIN = '/* ===== 繁体按需子集（由 tools/subset-fonts.js 自动生成，勿手改）===== */';
const TC_END = '/* ===== 繁体按需子集结束 ===== */';

function unicodeRanges(chars) {
    const cps = [...new Set(chars.map((ch) => ch.codePointAt(0)))].sort((a, b) => a - b);
    const ranges = [];
    for (const cp of cps) {
        const last = ranges[ranges.length - 1];
        if (last && cp === last[1] + 1) last[1] = cp;
        else ranges.push([cp, cp]);
    }
    return ranges
        .map(([a, b]) => (a === b ? `u+${a.toString(16)}` : `u+${a.toString(16)}-${b.toString(16)}`))
        .join(', ');
}

function updateFontsCss(rangesCss) {
    const p = path.join(ROOT, 'css', 'fonts.css');
    let css = fs.readFileSync(p, 'utf8');
    const block = [
        TC_BEGIN,
        '@font-face {',
        '    font-family: "Noto Serif SC";',
        '    src: url("../fonts/NotoSerifSC-TC.woff2") format("woff2");',
        '    font-weight: 100 900;',
        '    font-style: normal;',
        '    font-display: swap;',
        `    unicode-range: ${rangesCss};`,
        '}',
        TC_END,
    ].join('\n');
    const start = css.indexOf(TC_BEGIN);
    if (start !== -1) {
        const end = css.indexOf(TC_END);
        css = css.slice(0, start) + block + css.slice(end + TC_END.length);
    } else {
        css = css.replace(/\s*$/, '') + '\n\n' + block + '\n';
    }
    fs.writeFileSync(p, css);
    console.log('css/fonts.css 繁体按需块已更新，unicode-range 项数:', rangesCss.split(',').length);
}

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

    // 繁体按需小文件（同样来自 NotoSerifSC.ttf；Noto Serif SC 完整字库本身收录繁体码位）
    const tcSrc = path.join(ROOT, 'fonts', 'NotoSerifSC.ttf');
    if (!tradExtra.length) {
        console.log('无繁体新增字符，跳过繁体子集');
    } else if (!fs.existsSync(tcSrc)) {
        console.log('NotoSerifSC.ttf 不存在，跳过繁体子集');
    } else {
        const out = await subsetFont(fs.readFileSync(tcSrc), tradExtra.join(''), { targetFormat: 'woff2' });
        fs.writeFileSync(path.join(ROOT, 'fonts', 'NotoSerifSC-TC.woff2'), out);
        console.log('NotoSerifSC-TC.woff2', (out.length / 1024).toFixed(1) + ' KB');
        updateFontsCss(unicodeRanges(tradExtra));
    }
})().catch((e) => { console.error(e); process.exit(1); });
