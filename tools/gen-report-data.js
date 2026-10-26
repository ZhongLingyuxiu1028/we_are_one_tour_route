// tools/gen-report-data.js · 生成「我的白头到老 · 观演回忆录」互动板块的数据文件
//
// 用法：在仓库根目录执行 `node tools/gen-report-data.js`
// 输入：data/setlist/*.html（主歌单表格，兼容「单日纵排 / 多日并排」两种布局）+ data/json/itinerary.json
// 输出：data/json/report-data.json（供 js/tabs/report.js fetch 使用）
//
// 口径（详见 docs/interaction-report-design.md §3）：
//   - freq：歌名 → 全巡演出现场次数（场次内去重；布局解析时剔除施工占位站点）
//   - shows：全部场次（含歌单未施工的未来站点，noSetlist=true，songs 为空）
//   - theme：场次主题（站长维护，见 THEME_MAP；随巡演推进补充新场次主题）
//   - lyrics：歌名 → 歌词文件（取自 data/songlist/*.md 的 lyric-trigger，供报告 BGM 文案做歌词关键词匹配）

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SETLIST_DIR = path.join(ROOT, 'data', 'setlist');
const SONGLIST_DIR = path.join(ROOT, 'data', 'songlist');
const ITINERARY_FILE = path.join(ROOT, 'data', 'json', 'itinerary.json');
const OUTPUT_FILE = path.join(ROOT, 'data', 'json', 'report-data.json');

// 站点元信息（与 data/json/itinerary.json 的 setlist-name 对应）
const CITY_INFO = {
    hongkong:    { no: 1,  cn: '香港站',       en: 'Hong Kong',           emoji: '',   region: '中国香港' },
    foshan:      { no: 2,  cn: '佛山站',       en: 'Foshan',              emoji: '',   region: '广东' },
    chengdu:     { no: 3,  cn: '成都站',       en: 'Chengdu',             emoji: '🐼', region: '四川' },
    wuhan:       { no: 4,  cn: '武汉站',       en: 'Wuhan',               emoji: '🥟', region: '湖北' },
    hangzhou:    { no: 5,  cn: '杭州站',       en: 'Hangzhou',            emoji: '',   region: '浙江' },
    macau:       { no: 6,  cn: '澳门站',       en: 'Macau',               emoji: '🐎', region: '中国澳门' },
    kualalumpur: { no: 7,  cn: '吉隆坡站',     en: 'Kuala Lumpur',        emoji: '',   region: '马来西亚' },
    singapore:   { no: 8,  cn: '新加坡站',     en: 'Singapore',           emoji: '',   region: '新加坡' },
    xi_an:       { no: 9,  cn: '西安站',       en: "Xi'an",               emoji: '',   region: '陕西' },
    guangzhou:   { no: 10, cn: '广州站',       en: 'Guangzhou',           emoji: '',   region: '广东' },
    shanghai:    { no: 11, cn: '上海站',       en: 'Shanghai',            emoji: '',   region: '上海' },
    beijing:     { no: 12, cn: '北京站',       en: 'Beijing',             emoji: '',   region: '北京' },
    shenzhen:    { no: 13, cn: '深圳站',       en: 'Shenzhen',            emoji: '',   region: '广东' },
    chongqing:   { no: 14, cn: '重庆站',       en: 'Chongqing',           emoji: '',   region: '重庆' },
    nanjing:     { no: 15, cn: '南京站',       en: 'Nanjing',             emoji: '',   region: '江苏' },
    lasvegas:    { no: 16, cn: '拉斯维加斯站', en: 'Las Vegas',           emoji: '',   region: '美国' },
    california:  { no: 17, cn: '北加州站',     en: 'Northern California', emoji: '',   region: '美国' }
};

// 场次主题（key = 场次 id，即 setlist 文件名 + 场次序号）
const THEME_MAP = {
    hongkong3:  { emoji: '🎂',   name: '生日场' },
    foshan1:    { emoji: '🦁',   name: '醒狮场' },
    chengdu0:   { emoji: '🕯️🐼', name: '祈福熊猫场' },
    wuhan0:     { emoji: '🥟',   name: '冬至场' },
    hangzhou1:  { emoji: '🎆',   name: '新年场' },
    macau0:     { emoji: '🧧',   name: '新春场' },
    macau1:     { emoji: '🧧',   name: '新春场' },
    singapore1: { emoji: '🐇',   name: '复活节场' },
    xi_an0:     { emoji: '🏯',   name: '古城汉服场' },
    guangzhou1: { emoji: '💐',   name: '母亲节场' },
    guangzhou2: { emoji: '🎓',   name: '毕业季场' },
    beijing0:   { emoji: '🎭',   name: '京剧场' },
    chongqing0: { emoji: '🎂',   name: '生日场' }
};

const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// 歌词索引：data/songlist/*.md 中每个 lyric-trigger（歌名 → data/lyrics/ 下的歌词文件）。
// key 归一化：去空白 / Markdown 转义 / 括号后缀（开场版等）与 emoji、标点装饰，
// 与报告端（js/tabs/report.js）的查找口径一致；同名歌保留首个命中（正选与安可共用歌词）。
function buildLyricsIndex() {
    const norm = (s) => s.replace(/\\|\s+/g, '').replace(/[^\p{L}\p{N}\[\]]/gu, '');
    const index = {};
    const put = (name, file) => {
        const key = norm(name);
        if (key && !index[key]) index[key] = file;
    };
    for (const file of fs.readdirSync(SONGLIST_DIR).filter(f => f.endsWith('.md'))) {
        const md = fs.readFileSync(path.join(SONGLIST_DIR, file), 'utf8');
        for (const m of md.matchAll(/data-lyric-file="([^"]+)"[^>]*>([\s\S]*?)<\/span>/g)) {
            const plain = stripTags(m[2]);          // 「决定 <strong>\[国]</strong>」→「决定 \[国]」
            put(plain, m[1]);
            const bare = plain.replace(/\\|\s+/g, '').replace(/（[^）]*）|\([^)]*\)/g, '');
            if (bare !== plain) put(bare, m[1]);
        }
    }
    return index;
}

// 解析一个歌单文件 → 该站场次数组（多日期文件为「每日期一列」的并排表，单日期为纵排表）
function parseSetlistFile(file) {
    const key = file.replace('.html', '');
    const html = fs.readFileSync(path.join(SETLIST_DIR, file), 'utf8');
    const table = html.match(/<table[\s\S]*?<\/table>/);
    if (!table) return []; // 「🚧 等待施工……」占位站点，无歌单表格

    const rows = [...table[0].matchAll(/<tr[\s\S]*?<\/tr>/g)].map(m => m[0]);
    const dateRow = rows.find(r => /date-header/.test(r));
    const dates = [...dateRow.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map(m => stripTags(m[1]));
    const shows = dates.map(d => ({ key, date: d, songs: [] }));

    let chapter = '';
    for (const row of rows) {
        if (/date-header|label-header/.test(row)) continue;
        if (/chapter-row/.test(row)) {
            const m = row.match(/chapter-row[^>]*>([\s\S]*?)<\/td>/);
            chapter = m ? stripTags(m[1]) : chapter;
            continue;
        }
        const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => stripTags(m[1]));
        if (tds.length < 3) continue;
        for (let i = 0; i < dates.length; i++) {
            const [no, song, by] = tds.slice(i * 3, i * 3 + 3);
            if (no && song) shows[i].songs.push([song, by, chapter]);
        }
    }
    return shows;
}

// ---- 主流程 ----
const itinerary = JSON.parse(fs.readFileSync(ITINERARY_FILE, 'utf8'));
const order = itinerary.map(s => s['setlist-name']);

const parsed = {};
for (const file of fs.readdirSync(SETLIST_DIR).filter(f => f.endsWith('.html'))) {
    for (const show of parseSetlistFile(file)) (parsed[show.key] = parsed[show.key] || []).push(show);
}

const shows = [];
for (const key of order) {
    const info = CITY_INFO[key];
    if (!info) { console.error('itinerary 中存在未登记的站点：', key); process.exit(1); }
    const itin = itinerary.find(s => s['setlist-name'] === key);
    const list = parsed[key] || [];
    if (!list.length) {
        // 未来站点：场次来自 itinerary 日期，歌单待施工
        (itin.date.split(',')).forEach((d, i) => {
            shows.push({
                id: key + i, key, ...info, venue: itin.location,
                date: d.trim().replace(/-/g, '/'),
                theme: null, noSetlist: true, songs: []
            });
        });
        continue;
    }
    list.forEach((sh, i) => {
        // 保留场内全部演出行：同一首歌在同一场可能多次出现（如开场 + 安可，安可可能有嘉宾同台），
        // 去重交给消费方（freq 按「出现的场次」计数，报告端以 Set 归并）
        shows.push({
            id: key + i, key, ...info, venue: itin.location,
            date: sh.date,
            theme: THEME_MAP[key + i] || null,
            noSetlist: false,
            songs: sh.songs.map(([song, by, chapter]) => [song, by, chapter])
        });
    });
}

// 全局稀有度：歌名 → 出现的场次数（同一场内的多次出现只计一次）。
// 口径：曲目身份 = 剥离「不含『版』字的括号后缀」——
//   ·（New！🆕）是巡演首唱标记、（👩‍❤️‍💋‍👨）/（✨）等是舞台装饰，均不改变歌曲身份
//     （如《爱到分离仍是爱（👩‍❤️‍💋‍👨）》与《爱到分离仍是爱》合计出现场次）；
//   · 含「版」的后缀（生日版/熊猫版/川剧版/发光舞扇版…）是真实的独立舞台版本，保留独立计数。
const songIdentity = (s) => s.replace(/（(?![^）]*版)[^）]*）/g, '').trim();
const freq = {};
for (const show of shows) {
    if (show.noSetlist) continue;
    const uniq = new Set(show.songs.map(([song]) => songIdentity(song)));
    for (const song of uniq) freq[song] = (freq[song] || 0) + 1;
}

const lyricsIndex = buildLyricsIndex();
const out = { generatedAt: new Date().toISOString().slice(0, 10), freq, shows, lyrics: lyricsIndex };
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out));

const withSetlist = shows.filter(s => !s.noSetlist).length;
console.log(`已生成 ${path.relative(ROOT, OUTPUT_FILE)}`);
console.log(`场次 ${shows.length} 场（含歌单 ${withSetlist} 场 / 待施工 ${shows.length - withSetlist} 场），曲目名 ${Object.keys(freq).length} 个，歌词索引 ${Object.keys(lyricsIndex).length} 首`);
