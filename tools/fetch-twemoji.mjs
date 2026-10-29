// tools/fetch-twemoji.mjs
// 扫描全站文本文件中的 emoji，下载对应 Twemoji SVG 到 lib/twemoji/svg/（自托管子集）。
// 新增含 emoji 的内容后重新运行：node tools/fetch-twemoji.mjs
// 资源源：jdecked/twemoji v15.1.0（Twitter Twemoji 的持续维护 fork，图形 CC-BY 4.0）

import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { constants } from 'node:fs';

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, 'lib', 'twemoji', 'svg');
const CDN = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@v15.1.0/assets/svg/';
const SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/twemoji@14.0.2/dist/twemoji.min.js';
const SCRIPT_OUT = join(ROOT, 'lib', 'twemoji.min.js');

// 扫描的扩展名（覆盖 HTML 模板 / JS / i18n JSON / CSS / Markdown 数据）
const SCAN_EXT = new Set(['.html', '.js', '.mjs', '.json', '.css', '.md', '.txt']);
// 跳过的目录：第三方库 / 非站点资源 / 工具自身输出
const SKIP_DIRS = new Set(['.git', '.idea', '.screenshots', '.trae-html-share-packages', 'lib', 'img', 'fonts', 'node_modules', 'docs']);

// ---- emoji 序列提取 ----
// 聚合规则：ZWJ(200d) 连接的多个 pictographic 组成一个序列；FE0F 变体与肤色修饰跟当前序列；
// 国旗区域指示符两两配对；相邻但无 ZWJ 的独立 emoji 分开成序列
function extractEmojiSequences(text) {
    const out = [];
    let cur = null;
    const push = () => { if (cur) { out.push(cur); cur = null; } };
    for (const ch of text) {
        const cp = ch.codePointAt(0);
        const isPict = /\p{Extended_Pictographic}/u.test(ch);
        const isRI = cp >= 0x1f1e6 && cp <= 0x1f1ff;
        if (cp === 0x200d) { // ZWJ：连接
            if (cur) cur.push(cp);
            continue;
        }
        if (cp === 0xfe0f || (cp >= 0x1f3fb && cp <= 0x1f3ff)) { // 变体/肤色：跟随当前序列
            if (cur) cur.push(cp);
            continue;
        }
        if (isRI) { // 国旗 RI 两两配对
            const last = cur && cur[cur.length - 1];
            const riCount = cur ? cur.filter(c => c >= 0x1f1e6 && c <= 0x1f1ff).length : 0;
            if (cur && last >= 0x1f1e6 && last <= 0x1f1ff && riCount % 2 === 1) cur.push(cp);
            else { push(); cur = [cp]; }
            continue;
        }
        if (isPict) {
            const last = cur && cur[cur.length - 1];
            if (cur && last === 0x200d) cur.push(cp); // 仅 ZWJ 后才续接
            else { push(); cur = [cp]; }
            continue;
        }
        if (cp === 0x20e3) { // keycap 组合（数字/#+组合符）
            if (cur) cur.push(cp);
            continue;
        }
        push();
    }
    push();
    return out;
}

const fileName = (cps) => cps.map(cp => cp.toString(16)).join('-');
const stripFe0f = (name) => name.split('-').filter(p => p !== 'fe0f').join('-');

async function* walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) yield* walk(full);
        } else if (SCAN_EXT.has(extname(entry.name).toLowerCase())) {
            yield full;
        }
    }
}

async function fetchBuf(url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
}

const [cmd] = process.argv.slice(2);
const keepAll = cmd === '--prune=off' || cmd === 'keep';

// ---- 1. 扫描 ----
const wanted = new Map(); // 标准名(带fe0f) -> 实际落地文件名
const foundIn = new Map(); // 文件名 -> 出现位置样例
for await (const file of walk(ROOT)) {
    const text = await readFile(file, 'utf8').catch(() => '');
    if (!text) continue;
    for (const seq of extractEmojiSequences(text)) {
        const name = fileName(seq);
        if (!wanted.has(name)) {
            wanted.set(name, null);
            foundIn.set(name, file.slice(ROOT.length + 1));
        }
    }
}
console.log(`发现 ${wanted.size} 个唯一 emoji 序列`);

// ---- 2. 下载 ----
await mkdir(OUT_DIR, { recursive: true });
let ok = 0, miss = [];
for (const [name, _] of wanted) {
    const local = join(OUT_DIR, `${name}.svg`);
    const localBare = join(OUT_DIR, `${stripFe0f(name)}.svg`);
    let data = null, saveAs = local;
    // 已存在（标准名或裸名形式）则跳过下载
    try { await access(local, constants.F_OK); ok++; continue; } catch {}
    try { await access(localBare, constants.F_OK); ok++; continue; } catch {}
    data = await fetchBuf(CDN + name + '.svg');
    if (!data && stripFe0f(name) !== name) {
        data = await fetchBuf(CDN + stripFe0f(name) + '.svg');
        saveAs = localBare;
    }
    if (!data) { miss.push(name); continue; }
    await writeFile(saveAs, data);
    ok++;
    console.log(`  ✓ ${name}  (${foundIn.get(name)})`);
}

// ---- 3. twemoji 解析脚本 ----
try { await access(SCRIPT_OUT, constants.F_OK); }
catch {
    const js = await fetchBuf(SCRIPT_URL);
    if (js) { await writeFile(SCRIPT_OUT, js); console.log(`✓ lib/twemoji.min.js 已下载`); }
    else console.log('✗ twemoji.min.js 下载失败，请检查网络后重试');
}

// ---- 4. 报告 ----
console.log(`\n完成：${ok} 个 SVG 就绪 → lib/twemoji/svg/`);
if (miss.length) {
    console.log(`未找到资源的序列（请人工确认）：\n  ${miss.join('\n  ')}`);
    console.log('（Twemoji 库对 fe0f 变体有运行时回退，个别缺失通常不影响显示）');
}
console.log('提示：运行 node tools/fetch-twemoji.mjs --prune=off 可增量补齐，本脚本不会删除已下载文件');
