// js/tabs/report.js · 「我的白头到老 · 观演回忆录」互动板块
//
// 流程：勾选观演场次（本地保存）→ 生成过场 → 观演回忆录（统计/成就/分享卡片）
// 数据：data/json/report-data.json（由 tools/gen-report-data.js 从 data/setlist/ 生成，口径见 docs/interaction-report-design.md §3）
// 隐私：勾选 / 名字 / BGM / 留言仅存于浏览器 localStorage（key: waone-report-selection），不做上传

import { setActive, setActiveTabButton, showContent, getContentEl } from './core.js';

const STORE_KEY = 'waone-report-selection';
const OVERSEA_KEYS = ['kualalumpur', 'singapore', 'lasvegas', 'california'];
// 各站场馆经纬度（lng, lat）· 与 data/json/itinerary.json 的 coord 一致，用于观演里程估算
const VENUE_COORDS = {
    hongkong: [114.181944, 22.301389],
    foshan: [113.140953, 22.959949],
    chengdu: [104.13, 30.53],
    wuhan: [114.133882, 30.63674],
    hangzhou: [120.230349, 30.228173],
    macau: [113.566, 22.145],
    kualalumpur: [101.6931889, 3.0538522],
    singapore: [103.879092, 1.349985],
    xi_an: [108.547289, 34.182937],
    guangzhou: [113.602685, 23.116052],
    shanghai: [121.475, 31.15528],
    beijing: [116.390218, 39.996251],
    shenzhen: [114.226888, 22.699762],
    chongqing: [106.508538, 29.38039],
    nanjing: [118.663643, 32.049184],
    lasvegas: [-115.1797, 36.1078],
    california: [-121.3136, 38.8405]
};
// 居住地候选城市（中文名, 区域, 拼音, lng, lat）· 供居住地下拉选择，坐标为城市中心点
const HOME_CITIES = [
    ['广州', '广东', 'guangzhou', 113.264, 23.129], ['深圳', '广东', 'shenzhen', 114.058, 22.543],
    ['佛山', '广东', 'foshan', 113.122, 23.029], ['东莞', '广东', 'dongguan', 113.752, 23.021],
    ['珠海', '广东', 'zhuhai', 113.577, 22.271], ['中山', '广东', 'zhongshan', 113.393, 22.517],
    ['惠州', '广东', 'huizhou', 114.413, 23.112], ['江门', '广东', 'jiangmen', 113.078, 22.578],
    ['汕头', '广东', 'shantou', 116.682, 23.354], ['湛江', '广东', 'zhanjiang', 110.359, 21.271],
    ['香港', '中国香港', 'xianggang', 114.169, 22.319], ['澳门', '中国澳门', 'aomen', 113.549, 22.199],
    ['北京', '北京', 'beijing', 116.407, 39.904], ['上海', '上海', 'shanghai', 121.474, 31.230],
    ['天津', '天津', 'tianjin', 117.201, 39.085], ['重庆', '重庆', 'chongqing', 106.551, 29.563],
    ['成都', '四川', 'chengdu', 104.066, 30.572], ['武汉', '湖北', 'wuhan', 114.306, 30.593],
    ['杭州', '浙江', 'hangzhou', 120.155, 30.274], ['南京', '江苏', 'nanjing', 118.797, 32.061],
    ['西安', '陕西', 'xian', 108.940, 34.342], ['长沙', '湖南', 'changsha', 112.982, 28.194],
    ['郑州', '河南', 'zhengzhou', 113.625, 34.747], ['合肥', '安徽', 'hefei', 117.286, 31.864],
    ['南昌', '江西', 'nanchang', 115.858, 28.683], ['福州', '福建', 'fuzhou', 119.297, 26.074],
    ['厦门', '福建', 'xiamen', 118.089, 24.479], ['泉州', '福建', 'quanzhou', 118.589, 24.913],
    ['济南', '山东', 'jinan', 117.121, 36.652], ['青岛', '山东', 'qingdao', 120.383, 36.067],
    ['石家庄', '河北', 'shijiazhuang', 114.515, 38.043], ['太原', '山西', 'taiyuan', 112.549, 37.857],
    ['沈阳', '辽宁', 'shenyang', 123.432, 41.806], ['大连', '辽宁', 'dalian', 121.615, 38.914],
    ['长春', '吉林', 'changchun', 125.324, 43.886], ['哈尔滨', '黑龙江', 'haerbin', 126.534, 45.803],
    ['昆明', '云南', 'kunming', 102.833, 24.880], ['贵阳', '贵州', 'guiyang', 106.630, 26.648],
    ['南宁', '广西', 'nanning', 108.366, 22.817], ['桂林', '广西', 'guilin', 110.290, 25.274],
    ['海口', '海南', 'haikou', 110.199, 20.044], ['三亚', '海南', 'sanya', 109.512, 18.253],
    ['兰州', '甘肃', 'lanzhou', 103.834, 36.061], ['乌鲁木齐', '新疆', 'wulumuqi', 87.617, 43.793],
    ['苏州', '江苏', 'suzhou', 120.585, 31.299], ['无锡', '江苏', 'wuxi', 120.302, 31.571],
    ['宁波', '浙江', 'ningbo', 121.622, 29.874], ['温州', '浙江', 'wenzhou', 120.699, 27.994],
    ['台北', '台湾', 'taibei', 121.565, 25.033],
    ['吉隆坡', '马来西亚', 'jilongpo', 101.687, 3.139], ['新加坡', '新加坡', 'xinjiapo', 103.820, 1.352],
    ['曼谷', '泰国', 'mangu', 100.502, 13.756], ['东京', '日本', 'dongjing', 139.692, 35.690],
    ['首尔', '韩国', 'shouer', 126.978, 37.566], ['伦敦', '英国', 'lundun', -0.128, 51.507],
    ['巴黎', '法国', 'bali', 2.352, 48.857], ['纽约', '美国', 'niuyue', -74.006, 40.713],
    ['洛杉矶', '美国', 'luoshanji', -118.244, 34.052], ['旧金山', '美国', 'jiujinshan', -122.419, 37.775],
    ['拉斯维加斯', '美国', 'lasiweijiasi', -115.139, 36.175], ['西雅图', '美国', 'xiyatu', -122.332, 47.606],
    ['多伦多', '加拿大', 'duolunduo', -79.383, 43.653], ['温哥华', '加拿大', 'wengehua', -123.121, 49.283],
    ['悉尼', '澳大利亚', 'xini', 151.209, -33.868], ['墨尔本', '澳大利亚', 'moerben', 144.963, -37.814]
];
// 分享卡片二维码指向线上报告页（扫码直达）
const REPORT_URL = 'https://zhonglingyuxiu1028.github.io/we_are_one_tour_route/#report';
const GUEST_RE = /黄博|侧田|李昊|Hacken|Adam Lee|Alex|Eason/;      // test / match 用（无状态）
const GUEST_RE_G = /黄博|侧田|李昊|Hacken|Adam Lee|Alex|Eason/g;   // exec 循环用（需 g 标志）
const LOADING_STEPS = ['loading1', 'loading2', 'loading3'];
const LOADING_EMOJIS = ['🎧', '🗺️', '✨'];
const NAME_MAX = 20;
const MSG_MAX = 120;
// 成就分组与展示顺序（组内顺序 = ACH_DEFS 定义顺序，组名文案 key 见 i18n report.ach.grp.*）
const ACH_GROUPS = ['milestone', 'city', 'mileage', 'special', 'stage'];

let cachedData = null;          // report-data.json（每页加载取一次）
let showsById = {};
let sel = new Set();            // 已勾选场次 id
let userName = '';
let home = null;                // 居住地 { cn, region, lng, lat }，空则隐藏观演里程板块
let favSong = '';               // BGM 选歌
let msgText = '';               // 送给 Lam & Sally 的留言
let bgmVariant = 0;             // BGM 句式轮播序号
let bgmCustom = '';             // 用户自写的 BGM 一句话
let lastView = 'select';        // 语言切换重载时恢复所在视图
let favDDOutside = null;        // BGM 下拉「点击外部关闭」的文档级监听（重渲染时替换，避免堆积）
let homeDDOutside = null;       // 居住地下拉同上

const t = (key, params) => window.i18n.t(key, params);
const esc = (s) => String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const fmtKm = (n) => Math.round(n).toLocaleString('en-US');
// 球面直线距离（Haversine，单位 km）· 里程仅供参考
function hav(lng1, lat1, lng2, lat2) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}
// ---- 巡演时光轴（横向双年月份网格）工具 ----
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const dayOfYear = (d) => Math.round((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1;
// 同城日期段合并：连续日 →「10/9–13」，多段用分隔符连接（悬浮提示里的日期）
function dateRangeLabel(list, sep) {
    const runs = [];
    list.forEach(s => {
        const m = shortDate(s.date).match(/(\d{1,2})\/(\d{1,2})/);
        if (!m) return;
        const mo = +m[1], d = +m[2];
        const last = runs[runs.length - 1];
        if (last && last.m === mo && d === last.d2 + 1) last.d2 = d;
        else runs.push({ m: mo, d, d2: d });
    });
    return runs.map(r => r.d === r.d2 ? `${r.m}/${r.d}` : `${r.m}/${r.d}–${r.d2}`).join(sep || '、');
}
// 城市名标签半宽（%）估算：CJK/全角 ≈12.5px，其余 ≈6.2px；620px 为最窄图宽，宽屏下只会更宽松
function labelHalfPct(st) {
    const s = st.city.replace(/站$/, '') + (st.emoji ? ' ' + st.emoji : '');
    let w = 6;
    for (let i = 0; i < s.length; i++) w += s.charCodeAt(i) >= 0x2E80 ? 12.5 : 6.2;
    return (w / 2) / 620 * 100;
}
const cityOf = (s) => (window.i18n.currentLang === 'en' && s.en) ? s.en : s.cn;
const stripParens = (s) => s.replace(/（[^）]*）|\([^)]*\)/g, '').trim();
// 曲目身份：剥离「不含『版』字的括号后缀」（与 tools/gen-report-data.js 的 freq 口径一致）——
// （New！🆕）首唱标记、（👩‍❤️‍💋‍👨）/（✨）舞台装饰均并入歌曲身份；含『版』后缀（生日版/熊猫版…）为独立版本
const songIdentity = (s) => s.replace(/（(?![^）]*版)[^）]*）/g, '').trim();
const shortDate = (d) => {
    const c = stripParens(d);
    const m = c.match(/\d{4}\/(\d{1,2})\/(\d{1,2})/);
    return m ? `${m[1]}/${m[2]}` : c;
};
// 完整日期（含年份）——巡演跨 2026/2027 年，报告头部需标注年份避免歧义
const fullDate = (d) => {
    const c = stripParens(d);
    const m = c.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    return m ? `${m[1]}/${m[2]}/${m[3]}` : c;
};
const parseDate = (d) => {
    const m = stripParens(d).match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};
// 《男儿当自强》各舞台版本标签
function versionLabel(song) {
    if (song === '男儿当自强') return t('report.version.classic');
    if (song === '男儿当自强[国]') return t('report.version.mandarin');
    const m = song.match(/（([^）]*)）/);
    if (!m) return t('report.version.special');
    const inner = m[1].replace(/\s*[🐼🥋🐉🤖]\s*/g, '').trim();
    return inner || t('report.version.special');
}

// ---- 本地存储 ----
function loadStore() {
    try {
        const d = JSON.parse(localStorage.getItem(STORE_KEY));
        if (!d || !Array.isArray(d.ids)) return;
        sel = new Set(d.ids.filter(id => showsById[id]));
        userName = String(d.name || '').slice(0, NAME_MAX);
        home = (d.home && typeof d.home.lng === 'number') ? d.home : null;
        favSong = String(d.fav || '');
        msgText = String(d.msg || '').slice(0, MSG_MAX);
        bgmCustom = String(d.bgmCustom || '').slice(0, 60);
    } catch (e) { /* 损坏即视为空 */ }
}
function persist() {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify(
            { v: 1, ids: [...sel], name: userName, home, fav: favSong, msg: msgText, bgmCustom: bgmCustom }
        ));
    } catch (e) { /* 隐私模式等场景忽略 */ }
}

// ---- Tab 入口 ----
export async function loadReportTab(button) {
    const contentEl = getContentEl();
    setActiveTabButton(button);
    setActive(button);
    showContent();
    contentEl.innerHTML =
        `<div class="rp-root" id="rpRoot"><div class="rp-loading">` +
        `<div class="rp-spinner-wrap"><div class="rp-spinner"></div><span class="rp-loading-emoji" id="rpLoadingEmoji">🎧</span></div>` +
        `<p class="rp-loading-txt">${esc(t('loading.report'))}</p></div></div>`;

    try {
        if (!cachedData) {
            const res = await fetch('data/json/report-data.json');
            if (!res.ok) throw new Error('report-data.json not found');
            cachedData = await res.json();
            showsById = {};
            cachedData.shows.forEach(s => { showsById[s.id] = s; });
            lyricIndex = cachedData.lyrics || {};
            loadStore();
        }
        if (lastView === 'report' && sel.size) {
            renderReport();
        } else {
            lastView = 'select';
            renderSelect();
        }
    } catch (err) {
        console.error('Failed to load report:', err);
        contentEl.innerHTML =
            `<div class="rp-root"><div class="rp-empty">${esc(t('error.loadFailed'))}</div></div>`;
    }
}

function stepsHTML(active) {
    return `<div class="rp-steps">` +
        `<span class="rp-step${active === 1 ? ' is-active' : ''}">${esc(t('report.step1'))}</span>` +
        `<span class="rp-step-dot"></span>` +
        `<span class="rp-step${active === 2 ? ' is-active' : ''}">${esc(t('report.step2'))}</span>` +
        `<span class="rp-step-dot"></span>` +
        `<span class="rp-step${active === 3 ? ' is-active' : ''}">${esc(t('report.step3'))}</span>` +
        `</div>`;
}

// ---- ① 勾选场次 ----
function renderSelect() {
    lastView = 'select';
    const root = document.getElementById('rpRoot');
    if (!root) return;

    const cityOrder = [];
    cachedData.shows.forEach(s => { if (!cityOrder.includes(s.key)) cityOrder.push(s.key); });

    const cityCards = cityOrder.map(key => {
        const shows = cachedData.shows.filter(s => s.key === key);
        const first = shows[0];
        const chips = shows.map(s => {
            const th = s.theme;
            return `<label class="rp-chip"><input type="checkbox" data-id="${s.id}"` +
                `${sel.has(s.id) ? ' checked' : ''}><span>${shortDate(s.date)}` +
                `${th ? ' ' + th.emoji + esc(th.name) : ''}` +
                `${s.noSetlist ? ' ✱' : ''}</span></label>`;
        }).join('');
        const notes = [];
        if (shows.some(s => s.noSetlist)) notes.push(esc(t('report.note.noSetlist')));
        return `<div class="rp-city" data-city="${key}">` +
            `<div class="rp-city-top"><span class="rp-city-no">#${String(first.no).padStart(2, '0')}</span>` +
            `<span class="rp-city-name">${cityOf(first)} ${first.emoji}</span>` +
            `<span class="rp-region">${esc(first.region)}</span>` +
            `<button type="button" class="rp-city-all" data-city="${key}">${esc(t('report.city.all'))}</button></div>` +
            `<div class="rp-city-venue">${esc(first.venue)}</div>` +
            `<div class="rp-chips">${chips}</div>` +
            `${notes.length ? `<div class="rp-chip-note">${notes.join('<br>')}</div>` : ''}` +
            `</div>`;
    }).join('');

    root.innerHTML =
        `<div class="rp-head">` +
        `<div class="rp-kicker">WE ARE ONE · MY MEMORY</div>` +
        `<h2 class="rp-title">${esc(t('report.head.title')).replace(/\n/g, '<br class="rp-br">')}</h2>` +
        `<p class="rp-sub">${esc(t('report.sub1'))}<br>${esc(t('report.sub2'))}</p></div>` +
        stepsHTML(1) +
        `<div class="rp-name">` +
        `<label class="rp-name-label" for="rpName">${esc(t('report.name.label'))}</label>` +
        `<input type="text" id="rpName" class="rp-name-input" maxlength="${NAME_MAX}" placeholder="${esc(t('report.name.placeholder'))}">` +
        `</div>` +
        `<div class="rp-home">` +
        `<div class="rp-home-wrap" id="rpHomeWrap">` +
        `<label class="rp-home-label" for="rpHome">${esc(t('report.home.label'))}</label>` +
        `<span class="rp-home-box">` +
        `<input type="text" id="rpHome" class="rp-home-input" autocomplete="off" placeholder="${esc(t('report.home.placeholder'))}" aria-label="${esc(t('report.home.aria'))}">` +
        `<button type="button" class="rp-home-x" id="rpHomeClear" hidden aria-label="${esc(t('report.home.clear'))}" title="${esc(t('report.home.clear'))}">✕</button>` +
        `</span>` +
        `<div class="rp-home-panel" id="rpHomePanel" hidden>` +
        `<div class="rp-home-list" id="rpHomeList" role="listbox" aria-label="${esc(t('report.home.ariaList'))}"></div>` +
        `<div class="rp-home-empty" id="rpHomeEmpty" hidden>${esc(t('report.home.empty'))}</div>` +
        `</div>` +
        `</div>` +
        `<p class="rp-home-note">${esc(t('report.home.note'))}</p>` +
        `</div>` +
        `<div class="rp-citygrid">${cityCards}</div>` +
        `<div class="rp-bar"><p class="rp-alert" id="rpAlert" role="alert" hidden>${esc(t('report.empty'))}</p>` +
        `<div class="rp-bar-row"><span class="rp-count" id="rpCount" aria-live="polite"></span>` +
        `<span class="rp-bar-actions">` +
        `<button type="button" class="rp-btn rp-btn-ghost" id="rpClear">${esc(t('report.clear'))}</button>` +
        `<button type="button" class="rp-btn rp-btn-primary" id="rpGen">✨ ${esc(t('report.gen'))}</button>` +
        `</span></div></div>`;

    const nameInput = root.querySelector('#rpName');
    nameInput.value = userName;
    nameInput.addEventListener('change', () => {
        userName = nameInput.value.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
        persist();
    });

    // 居住地下拉（中文名/拼音过滤；选中的城市用于观演里程估算）
    const homeWrap = root.querySelector('#rpHomeWrap');
    const homeInput = root.querySelector('#rpHome');
    const homePanel = root.querySelector('#rpHomePanel');
    const homeList = root.querySelector('#rpHomeList');
    const homeEmpty = root.querySelector('#rpHomeEmpty');
    const homeClearBtn = root.querySelector('#rpHomeClear');
    function syncHomeInput() {
        homeWrap.classList.toggle('is-set', !!home);
        homeInput.value = home ? home.cn : '';
        homeClearBtn.hidden = !home;
    }
    function renderHomeList(q) {
        q = q.trim().toLowerCase();
        const hits = HOME_CITIES.filter(c => !q || c[0].includes(q) || c[2].includes(q));
        homeList.innerHTML = hits.map(c =>
            `<button type="button" class="rp-home-opt" role="option" data-cn="${esc(c[0])}">${esc(c[0])}<small>${esc(c[1])}</small></button>`
        ).join('');
        homeEmpty.hidden = hits.length > 0;
    }
    homeInput.addEventListener('focus', () => { renderHomeList(homeInput.value); homePanel.hidden = false; });
    homeInput.addEventListener('input', () => { renderHomeList(homeInput.value); homePanel.hidden = false; });
    homeInput.addEventListener('keydown', e => {
        if (e.key === 'Escape') homePanel.hidden = true;
    });
    homeList.addEventListener('click', e => {
        const opt = e.target.closest('.rp-home-opt');
        if (!opt) return;
        const c = HOME_CITIES.find(x => x[0] === opt.dataset.cn);
        if (c) home = { cn: c[0], region: c[1], lng: c[3], lat: c[4] };
        syncHomeInput();
        homePanel.hidden = true;
        persist();
    });
    homeClearBtn.addEventListener('click', () => {
        home = null;
        syncHomeInput();
        homeInput.focus();
        persist();
    });
    if (homeDDOutside) document.removeEventListener('pointerdown', homeDDOutside);
    homeDDOutside = e => { if (!homeWrap.contains(e.target)) homePanel.hidden = true; };
    document.addEventListener('pointerdown', homeDDOutside);
    syncHomeInput();

    root.querySelector('.rp-citygrid').addEventListener('change', (e) => {
        if (!e.target.matches('input[type="checkbox"]')) return;
        if (e.target.checked) sel.add(e.target.dataset.id); else sel.delete(e.target.dataset.id);
        root.querySelector('#rpAlert').hidden = true;
        refreshBar();
        persist();
    });
    root.querySelector('.rp-citygrid').addEventListener('click', (e) => {
        const btn = e.target.closest('.rp-city-all');
        if (!btn) return;
        const ids = cachedData.shows.filter(s => s.key === btn.dataset.city).map(s => s.id);
        const allOn = ids.every(id => sel.has(id));
        ids.forEach(id => { if (allOn) sel.delete(id); else sel.add(id); });
        btn.textContent = allOn ? t('report.city.all') : t('report.city.deselect');
        const card = root.querySelector(`.rp-city[data-city="${btn.dataset.city}"]`);
        card.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = !allOn; });
        refreshBar();
        persist();
    });
    root.querySelector('#rpClear').addEventListener('click', () => {
        sel.clear();
        userName = '';
        root.querySelector('#rpName').value = '';
        root.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
        refreshBar();
        persist();
    });
    root.querySelector('#rpGen').addEventListener('click', generate);

    refreshBar();
    // 「重新选择」从报告底部返回时，回到板块顶部
    scrollRootTop();
}

function refreshBar() {
    const root = document.getElementById('rpRoot');
    if (!root) return;
    const cities = new Set(cachedData.shows.filter(s => sel.has(s.id)).map(s => s.key));
    root.querySelector('#rpCount').textContent = t('report.count', { n: sel.size, m: cities.size });
    root.querySelector('#rpGen').disabled = sel.size === 0;
    root.querySelectorAll('.rp-city').forEach(card => {
        const key = card.dataset.city;
        const ids = cachedData.shows.filter(s => s.key === key).map(s => s.id);
        card.querySelector('.rp-city-all').textContent =
            ids.every(id => sel.has(id)) ? t('report.city.deselect') : t('report.city.all');
    });
}

// ---- ② 生成过场 ----
function generate() {
    if (sel.size === 0) {
        document.getElementById('rpAlert').hidden = false;
        return;
    }
    const root = document.getElementById('rpRoot');
    root.innerHTML =
        stepsHTML(2) +
        `<div class="rp-loading"><div class="rp-spinner-wrap"><div class="rp-spinner"></div><span class="rp-loading-emoji" id="rpLoadingEmoji">🎧</span></div>` +
        `<p class="rp-loading-txt" id="rpLoadingTxt" aria-live="polite">${esc(t('report.' + LOADING_STEPS[0]))}</p></div>`;
    // 勾选列表很长，点生成后回到板块顶部，让生成动画与报告开头可见
    scrollRootTop();

    let i = 0;
    const timer = setInterval(() => {
        i += 1;
        if (i < LOADING_STEPS.length) {
            const el = document.getElementById('rpLoadingTxt');
            const emoji = document.getElementById('rpLoadingEmoji');
            if (el) el.textContent = t('report.' + LOADING_STEPS[i]);
            if (emoji) emoji.textContent = LOADING_EMOJIS[i];
        }
    }, 650);
    setTimeout(() => {
        clearInterval(timer);
        renderReport();
    }, LOADING_STEPS.length * 650 + 250);
}

// ---- 报告计算 ----
function computeReport() {
    const shows = cachedData.shows.filter(s => sel.has(s.id));
    const themed = shows.reduce((acc, s) => {
        if (s.theme) acc.push({ theme: s.theme, where: cityOf(s) + ' ' + shortDate(s.date) });
        return acc;
    }, []);

    const dated = shows.map(s => ({ s, d: parseDate(s.date) })).filter(x => x.d);
    dated.sort((a, b) => a.d - b.d);
    const first = dated[0], last = dated[dated.length - 1];
    const spanDays = Math.round((last.d - first.d) / 86400000) + 1;

    const cityCount = {}, cityShows = {};
    shows.forEach(s => {
        cityCount[s.key] = (cityCount[s.key] || 0) + 1;
        (cityShows[s.key] = cityShows[s.key] || []).push(s);
    });
    const total = cachedData.shows.filter(s => !s.noSetlist).length;

    const isSong = (name) => !/VCR/i.test(name);
    // 稀有度按「曲目身份」统计：剥离不含『版』的装饰括号后，New 首唱版/emoji 装饰版与普通版是同一首歌
    const heard = {}, heardOrder = [], heardInfo = {};
    shows.forEach(s => {
        s.songs.forEach(([song, by]) => {
            if (!isSong(song)) return;
            const id = songIdentity(song);
            if (!heard[id]) {
                heard[id] = true;
                heardOrder.push(song); // 展示名保留首次出现的原名（含首唱/装饰标记）
                heardInfo[id] = { by, freq: cachedData.freq[id] || 0, userCities: [], userShows: 0, guest: false };
            }
            if (GUEST_RE.test(by)) heardInfo[id].guest = true;
            heardInfo[id].userShows += 1;
            const cn = cityOf(s);
            if (heardInfo[id].userCities.indexOf(cn) < 0) heardInfo[id].userCities.push(cn);
        });
    });
    const songCount = heardOrder.length;

    const solo = shows.filter(s => !s.noSetlist).reduce((acc, s) => {
        s.songs.forEach(([song]) => {
            const id = songIdentity(song);
            if (isSong(song) && cachedData.freq[id] === 1 && !acc.some(x => x.song === song)) {
                acc.push({ song, where: cityOf(s) + ' ' + shortDate(s.date) });
            }
        });
        return acc;
    }, []);

    // 声音构成
    const voice = { lam: 0, sally: 0, duet: 0, guest: 0 };
    heardOrder.forEach(displayName => {
        const info = heardInfo[songIdentity(displayName)];
        const by = String(info.by);
        if (info.guest) voice.guest += 1;
        const hasLam = /Lam/.test(by), hasSally = /Sally/.test(by);
        if (hasLam && hasSally) voice.duet += 1;
        else if (hasLam) voice.lam += 1;
        else if (hasSally) voice.sally += 1;
        else voice.duet += 1;
    });

    // 曲库覆盖度：曲目按去版本括号归一化（特别版本算一首）；Medley 整段不入库，
    // 但组曲内唱过的曲目计入「已听过」（如组曲中的《海阔天空》与单独演唱同曲）
    const base = (n) => stripParens(n);
    const libBases = {}, baseShowList = {};
    cachedData.shows.forEach(s => {
        if (s.noSetlist) return;
        s.songs.forEach(([song]) => {
            if (!isSong(song) || /^Medley/.test(song)) return;
            const b = base(song);
            libBases[b] = true;
            const list = baseShowList[b] = baseShowList[b] || [];
            if (!list.some(x => x.id === s.id)) list.push({ id: s.id, cn: cityOf(s), date: s.date });
        });
    });
    const heardBaseSet = {};
    heardOrder.forEach(name => {
        if (/^Medley/.test(name)) {
            name.replace(/^Medley：?/, '').split('+').forEach(p => {
                p = p.trim();
                if (p) heardBaseSet[base(p)] = true;
            });
        } else {
            heardBaseSet[base(name)] = true;
        }
    });
    const libCount = Object.keys(libBases).length;
    const heardInLib = Object.keys(heardBaseSet).filter(b => libBases[b]).length;
    const missing = Object.keys(libBases)
        .filter(b => !heardBaseSet[b])
        .map(b => {
            const list = baseShowList[b];
            const cities = [];
            list.forEach(x => { if (cities.indexOf(x.cn) < 0) cities.push(x.cn); });
            return { name: b, showCount: list.length, cities, date0: list[0].date };
        })
        .sort((a, b) => (a.showCount - b.showCount) || (parseDate(a.date0) - parseDate(b.date0)));
    const coverage = {
        lib: libCount, heard: heardInLib,
        pct: libCount ? Math.round(heardInLib / libCount * 100) : 0,
        missing
    };

    // 版本集邮与嘉宾
    const versions = {};
    shows.forEach(s => s.songs.forEach(([song]) => {
        if (song.indexOf('男儿当自强') >= 0) versions[versionLabel(song)] = true;
    }));
    const versionList = Object.keys(versions);
    // 嘉宾：一位嘉宾可能随多场巡演出现（如 Alex 随杭州、广州场），按场次去重后列出全部地点
    const guestRows = {};
    shows.forEach(s => s.songs.forEach(([, by]) => {
        GUEST_RE_G.lastIndex = 0;
        let m;
        while ((m = GUEST_RE_G.exec(by)) !== null) {
            (guestRows[m[0]] = guestRows[m[0]] || []).push({ id: s.id, cn: cityOf(s), date: s.date });
        }
    }));
    const guestList = Object.keys(guestRows).map(g => {
        const seen = new Set();
        const locs = [];
        guestRows[g].forEach(x => {
            if (seen.has(x.id)) return;
            seen.add(x.id);
            locs.push(x.cn + ' ' + shortDate(x.date));
        });
        return { name: g, where: locs.join('、') };
    });

    // 观演里程：按「居住地 ⇄ 场馆」每座城市一次往返直线距离合计；
    // 同城观演（居住城市=演出城市）属市内通勤，不计入；未填居住地则整节隐藏
    const miles = { rows: [], total: 0 };
    if (home) {
        Object.keys(cityShows).forEach(key => {
            if (cityShows[key][0].cn.replace(/站$/, '') === home.cn) return;   // 同城不计
            const coord = VENUE_COORDS[key];
            if (!coord) return;
            const oneWay = hav(home.lng, home.lat, coord[0], coord[1]);
            miles.rows.push({
                city: cityOf(cityShows[key][0]), emoji: cityShows[key][0].emoji,
                oneWay, round: oneWay * 2, cnt: cityShows[key].length
            });
        });
        miles.rows.sort((a, b) => b.oneWay - a.oneWay);
        miles.total = miles.rows.reduce((acc, row) => acc + row.round, 0);
    }

    // 巡演时光轴：全量站点 × 到场次数（每站一条药丸长条：长度=场次数，颜色按到场次数从浅到深）
    const dateSep = window.i18n.currentLang === 'en' ? ', ' : '、';
    const stopAll = {};
    cachedData.shows.forEach(s => { (stopAll[s.key] = stopAll[s.key] || []).push(s); });
    const now = new Date();
    const timeline = Object.keys(stopAll).map(key => {
        const list = stopAll[key].slice().sort((a, b) => parseDate(a.date) - parseDate(b.date));
        const first = parseDate(list[0].date);
        return {
            key, no: list[0].no, city: cityOf(list[0]), emoji: list[0].emoji,
            dates: dateRangeLabel(list, dateSep),
            first,
            firstDoy: dayOfYear(first),
            on: list.filter(s => sel.has(s.id)).length,
            total: list.length,
            futureAll: list.every(s => parseDate(s.date) > now)
        };
    }).sort((a, b) => a.no - b.no);

    const n = shows.length, m = Object.keys(cityCount).length;
    const tier = n >= 10 ? 'report.tier.5' : n >= 7 ? 'report.tier.4' : n >= 4 ? 'report.tier.3' : n >= 2 ? 'report.tier.2' : 'report.tier.1';
    const hasOversea = shows.some(s => OVERSEA_KEYS.includes(s.key));
    // 全勤判定：国内全勤 = 非海外站（含港澳台）全部勾选；全程全勤 = 巡演全部场次勾选
    const domesticAll = cachedData.shows.filter(s => !OVERSEA_KEYS.includes(s.key)).length;
    const domesticSel = shows.filter(s => !OVERSEA_KEYS.includes(s.key)).length;
    const fullDomestic = domesticAll > 0 && domesticSel === domesticAll;
    const fullTour = cachedData.shows.length > 0 && n === cachedData.shows.length;

    // ACH_DEFS 顺序 = 展示顺序，按 grp 分组排列
    const ACH_DEFS = [
        { emoji: '🌱', key: 'meet', grp: 'milestone', on: n >= 1 },
        { emoji: '💞', key: 'weareone', grp: 'milestone', on: n >= 5 },
        { emoji: '👩‍❤️‍💋‍👨', key: 'witness', grp: 'milestone', on: n >= 10 },
        { emoji: '🇨🇳', key: 'china', grp: 'milestone', on: fullDomestic },
        { emoji: '👑', key: 'fulltour', grp: 'milestone', on: fullTour },
        { emoji: '🏙️', key: 'twin', grp: 'city', on: m >= 2 },
        { emoji: '🚄', key: 'chase', grp: 'city', on: m >= 3 },
        { emoji: '🐼', key: 'panda', grp: 'city', on: shows.some(s => s.key === 'chengdu') },
        { emoji: '🌏', key: 'world', grp: 'city', on: hasOversea },
        { emoji: '🏟️', key: 'fullhouse', grp: 'city', on: Object.keys(cityShows).some(key => {
            const all = cachedData.shows.filter(s => s.key === key);
            return all.length >= 2 && cityShows[key].length === all.length;
        }) },
        // 观演里程（按「居住地 ⇄ 场馆」往返合计，同城不计；未填居住地则不点亮）
        { emoji: '🚗', key: 'miles100', grp: 'mileage', on: miles.total >= 50 },
        { emoji: '🚄', key: 'miles500', grp: 'mileage', on: miles.total >= 500 },
        { emoji: '✈️', key: 'miles5000', grp: 'mileage', on: miles.total >= 5000 },
        { emoji: '🎂', key: 'birthday', grp: 'special', on: themed.some(x => x.theme.name === '生日场') },
        { emoji: '💍', key: 'proposal', grp: 'special', on: shows.some(s => s.id === 'guangzhou0') },  // 广州 5/9 Danny 求婚场
        { emoji: '🎉', key: 'themed', grp: 'special', on: themed.length >= 2 },
        { emoji: '💎', key: 'solo', grp: 'stage', on: solo.length >= 1 },
        { emoji: '🥋', key: 'versions', grp: 'stage', on: versionList.length >= 3 },
        { emoji: '🎤', key: 'guest', grp: 'stage', on: guestList.length >= 1 }
    ];
    const achievements = ACH_DEFS.map(d => ({
        emoji: d.emoji,
        grp: d.grp,
        name: t(`report.ach.${d.key}`),
        cond: t(`report.ach.${d.key}.cond`),
        on: d.on
    }));

    const who = userName ? esc(userName) : esc(t('report.you'));
    const quote = n === 1
        ? t('report.quote.single', { city: first.s.en && window.i18n.currentLang === 'en' ? first.s.en : first.s.cn.replace(/站$/, ''), who })
        : t('report.quote.multi', {
            a: cityOf(first.s).replace(/站$/, ''), b: cityOf(last.s).replace(/站$/, ''), who, n
        });

    return {
        n, m, songCount, spanDays, total, themed, voice, coverage, miles, timeline,
        solo, versionList, guestList, tier, hasOversea, fullDomestic, fullTour, achievements, quote,
        firstShow: first.s, lastShow: last.s,
        songOrder: heardOrder, songInfo: heardInfo
    };
}

// ---- BGM 一句话（优先级见设计文档 §3.6）：歌词金句优先，无命中再按下列规则兜底 ----
// 每条规则配多个句式模板，variant 递增循环（「换一句」按钮驱动）
function songLine(name, info, variant, total) {
    const pick = (...keys) => t(keys[Math.abs(variant || 0) % keys.length], {
        song: name, a: info.userCities[0] ? info.userCities[0].replace(/站$/, '') : '',
        b: info.userCities.length ? info.userCities[info.userCities.length - 1].replace(/站$/, '') : '',
        n: info.userCities.length, guest: (String(info.by).match(GUEST_RE) || [])[0], t: total
    });
    if (/New！/.test(name)) return pick('report.line.new', 'report.line.new2', 'report.line.new3');
    if (info.freq === 1) return pick('report.line.solo', 'report.line.solo2', 'report.line.solo3');
    if (/（[^）]*版）/.test(name)) return pick('report.line.version', 'report.line.version2');
    if (GUEST_RE.test(String(info.by))) return pick('report.line.guest', 'report.line.guest2');
    if (info.userCities.length >= 3) return pick('report.line.multi', 'report.line.multi2', 'report.line.multi3');
    if (info.by === 'Sally') return pick('report.line.sally', 'report.line.sally2');
    if (info.by === 'Lam') return pick('report.line.lam', 'report.line.lam2');
    if (/^Medley/.test(name)) return pick('report.line.medley', 'report.line.medley2');
    if (info.by.indexOf('Lam & Sally') === 0) return pick('report.line.duet', 'report.line.duet2');
    return pick('report.line.default', 'report.line.default2');
}

// ---- 歌词金句（见设计文档 §3.6 P0）：按所选曲目的歌词做大致关键词匹配，引用一句真实歌词 ----
// 歌名 → 歌词文件索引来自 report-data.json（生成口径见 tools/gen-report-data.js buildLyricsIndex()）
const LYRIC_THEMES = [
    { key: 'free',    re: /自由|理想|天空|心中/ },
    { key: 'forever', re: /一生|一世|永遠|永远|白頭|白头|到老|歲月|岁月/ },
    { key: 'love',    re: /愛|爱|心|吻|戀|恋|擁抱|拥抱/ },
    { key: 'night',   re: /夜|晚|夢|梦|星|月/ },
    { key: 'road',    re: /風|风|雨|路|遠方|远方|千里|海|水/ },
    { key: 'tears',   re: /淚|泪|傷|伤|悲|痛|哭/ }
];
let lyricIndex = {};            // 歌名归一化 key → 歌词文件
const lyricCache = new Map();   // 歌词文件 → 行数组（失败也缓存空数组，避免反复重试）
let lyricReq = 0;               // 请求序号：快速换歌时丢弃过期结果
const lyricNorm = (s) => s.replace(/\\|\s+/g, '').replace(/[^\p{L}\p{N}\[\]]/gu, '');
function lyricRefFor(name) {
    const tryKeys = (k) => lyricIndex[lyricNorm(k)] || lyricIndex[lyricNorm(stripParens(k))] || null;
    const id = songIdentity(name);
    let file = tryKeys(id);
    if (file) return { file, song: name };
    // Medley：按「+」拆分逐段命中；文案中引用分曲名（比整串 Medley 名更自然）
    if (/^Medley[:：]/.test(id)) {
        for (const p of id.replace(/^Medley[:：]/, '').split(/[+＋]/)) {
            file = tryKeys(p);
            if (file) return { file, song: p };
        }
    }
    return null;
}
function lyricLinesOf(md) {
    return md.replace(/<br\s*\/?>/gi, '\n').split('\n')
        .map(l => l.replace(/^>\s?/, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
        .filter(l => l.length >= 4);
}
// 金句挑选：优先「副歌 hook」（歌词中重复出现的行），长度适中者优先；句式与引句都随 variant 轮换
function lyricPick(lines, variant, name) {
    const theme = LYRIC_THEMES.find(th => lines.some(l => th.re.test(l)));
    const cand = theme ? lines.filter(l => theme.re.test(l)) : lines;
    const short = cand.filter(l => l.length <= 24);
    const pool = short.length ? short : cand;
    const count = new Map();
    pool.forEach(l => count.set(l, (count.get(l) || 0) + 1));
    const uniq = [...new Set(pool)];
    uniq.sort((a, b) => ((count.get(b) > 1 ? 1 : 0) - (count.get(a) > 1 ? 1 : 0)) ||
        (Math.abs(a.length - 14) - Math.abs(b.length - 14)));
    const top = uniq.slice(0, 3);
    const base = theme ? theme.key : 'quote';
    const frames = [`report.lyric.${base}`, `report.lyric.${base}2`];
    return t(frames[Math.abs(variant) % frames.length], {
        song: name, line: top[Math.floor(Math.abs(variant) / frames.length) % top.length]
    });
}
async function lyricLine(name, variant) {
    const ref = lyricRefFor(name);
    if (!ref) return null;
    let lines = lyricCache.get(ref.file);
    if (!lines) {
        try {
            const res = await fetch(`data/lyrics/${ref.file}`, { headers: { 'Cache-Control': 'no-cache' } });
            lines = lyricLinesOf(res.ok ? await res.text() : '');
        } catch (e) { lines = []; }
        lyricCache.set(ref.file, lines);
    }
    return lines.length ? lyricPick(lines, variant, ref.song) : null;
}

// ---- ③ 报告 ----
// 巡演时光轴（横向 · 双年月份网格，样式与图例沿用原型）：
// 每站一条药丸长条——长度=场次数、颜色按到场次数从浅到深（未到场空心 / 未上演虚线）；
// 药丸起点对齐首场日期，悬浮显示三行气泡（站点 / 时间 / 到场数），无点击交互
function timelineHTML(r) {
    const isEn = window.i18n.currentLang === 'en';
    const monsTxt = isEn ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : null;
    const days = 365;
    const pct = (doy) => (doy - 0.5) / days * 100;
    const years = [...new Set(r.timeline.map(st => st.first.getFullYear()))].sort();
    const rowY = years.map((_, i) => 72 + i * 124);
    const plotH = 72 + (years.length - 1) * 124 + 68;
    const DOT = 9, GAP = 2, REF_W = 620;   // 点径/点距/估宽基准（最窄图宽，宽屏下只会更宽松）

    let grid = '', mons = '', cum = 0;
    for (let mI = 0; mI < 12; mI++) {
        if (mI > 0) grid += `<i class="rp-tlh-grid" style="left:${cum / days * 100}%"></i>`;
        mons += `<span class="rp-tlh-mon" style="left:${(cum + MONTH_DAYS[mI] / 2) / days * 100}%">${monsTxt ? monsTxt[mI] : (mI + 1) + '月'}</span>`;
        cum += MONTH_DAYS[mI];
    }

    let body = '';
    years.forEach((y, ri) => {
        const nodes = r.timeline.filter(st => st.first.getFullYear() === y);
        if (!nodes.length) return;
        const ly = rowY[ri];
        // 各站药丸：leftPct = 首场日期；串宽（%）用于横线与标签锚点
        const marks = nodes.map(nd => {
            const wPct = (nd.total * DOT + (nd.total - 1) * GAP) / REF_W * 100;
            return { nd, leftPct: pct(nd.firstDoy), wPct };
        });
        const p0 = Math.min(...marks.map(x => x.leftPct)) - DOT / 2 / REF_W * 100;
        const p1 = Math.max(...marks.map(x => x.leftPct + x.wPct)) + DOT / 2 / REF_W * 100;
        body += `<span class="rp-tlh-year" style="top:${ly}px">${y}</span>`;
        body += `<i class="rp-tlh-line" style="left:${p0}%;width:${p1 - p0}%;top:${ly}px"></i>`;
        // 标签防重叠：按估宽占位，上下交替优先，同侧放不下退到远一层
        const placed = [];
        const spanOf = (p, h) => {
            const tx = (p + 2 * h > 98) ? -100 : (p < 5 ? 0 : -50);
            return {
                tx,
                lo: tx === -100 ? p - 2 * h : tx === 0 ? p : p - h,
                hi: tx === -100 ? p : tx === 0 ? p + 2 * h : p + h
            };
        };
        marks.forEach((mk, i) => {
            const nd = mk.nd;
            const p = mk.leftPct + mk.wPct / 2;   // 标签/引线挂在药丸中心
            const head = t('report.tl.tipHead', { no: String(nd.no).padStart(2, '0'), city: nd.city });
            const status = t(nd.on > 0 ? 'report.tl.tipOn' : nd.futureAll ? 'report.tl.tipFuture' : 'report.tl.tipOff',
                { on: nd.on, tt: nd.total });
            const aria = `${head} · ${nd.dates} · ${status}`;
            // 药丸长条：长度=场次数；填充色按到场次数从浅到深（未到场空心 / 未上演虚线）
            const pillW = nd.total * DOT + (nd.total - 1) * GAP;
            let pillStyle = `left:${mk.leftPct}%;top:${ly}px;width:${pillW}px`;
            let pillCls = '';
            if (!nd.futureAll && nd.on > 0) {
                const ratio = nd.on / nd.total;
                const alpha = ratio >= 1 ? 1 : 0.25 + 0.75 * ratio;
                pillStyle += `;background:rgba(67,160,71,${alpha.toFixed(2)})` +
                    `;border-color:rgba(46,125,50,${Math.min(1, 0.35 + 0.65 * ratio).toFixed(2)})`;
            }
            if (nd.futureAll) pillCls = ' is-future';
            const isLast = nd.no === r.timeline[r.timeline.length - 1].no;   // 末位站点：气泡贴右防裁剪
            body += `<span class="rp-tlh-pill${pillCls}${isLast ? ' is-last' : ''}" style="${pillStyle}"` +
                ` role="img" aria-label="${esc(aria)}">` +
                `<span class="rp-tlh-tip${nd.on > 0 ? ' is-on' : ''}" role="tooltip">` +
                `<b>${esc(head)}</b><span>${esc(nd.dates)}</span><em>${esc(status)}</em></span></span>`;

            const h = labelHalfPct(nd);
            const prefer = i % 2 === 0 ? 'a' : 'b';
            const cands = prefer === 'a' ? [['a', 0], ['a', 1], ['b', 0], ['b', 1]] : [['b', 0], ['b', 1], ['a', 0], ['a', 1]];
            let side = cands[0][0], level = 0, sp = spanOf(p, h);
            for (const c of cands) {
                sp = spanOf(p, h);
                const ok = !placed.some(q => q.sd === c[0] && q.lv === c[1] && sp.lo < q.hi + 1 && q.lo < sp.hi + 1);
                if (ok) { side = c[0]; level = c[1]; break; }
            }
            placed.push({ sd: side, lv: level, lo: sp.lo, hi: sp.hi });
            const above = side === 'a';
            const labTop = above ? ly - 22 - level * 18 : ly + 22 + level * 18;
            const stemTop = above ? ly - 22 - level * 18 : ly + 7;
            const stemH = 15 + level * 18;
            body += `<i class="rp-tlh-stem" style="left:${p}%;top:${stemTop}px;height:${stemH}px"></i>` +
                `<span class="rp-tlh-lab${nd.on > 0 ? ' is-on' : nd.futureAll ? ' is-future' : ''}"` +
                ` style="left:${p}%;top:${labTop}px;transform:translate(${sp.tx}%,${above ? -100 : 0}%)">` +
                `${esc(nd.city.replace(/站$/, ''))}${nd.emoji ? ' ' + nd.emoji : ''}</span>`;
        });
    });
    // 今天的竖虚线（当前日期落在巡演年份内才画）
    const nowD = new Date();
    if (years.includes(nowD.getFullYear())) {
        body += `<i class="rp-tlh-today" style="left:${pct(dayOfYear(nowD))}%"></i>`;
    }

    return `<div class="rp-sec"><h4 class="rp-sec-title">🗓️ ${esc(t('report.sec.tl'))}</h4>` +
        `<p class="rp-sec-sub">${esc(t('report.tl.sub', { t: cachedData.shows.length, n: r.n }))}</p>` +
        `<div class="rp-tlh-scroll"><div class="rp-tlh-inner"><div class="rp-tlh-plot" style="height:${plotH}px">` +
        grid + mons + body +
        `</div></div></div>` +
        `<div class="rp-tlh-legend">` +
        `<span><i class="rp-lg-scale"></i>${esc(t('report.tl.legend.on'))}</span>` +
        `<span><i></i>${esc(t('report.tl.legend.off'))}</span>` +
        `<span><i class="is-future"></i>${esc(t('report.tl.legend.future'))}</span>` +
        `<span><i class="rp-tlh-today-demo"></i>${esc(t('report.tl.legend.today', { date: (nowD.getMonth() + 1) + '/' + nowD.getDate() }))}</span>` +
        `</div></div>`;
}

function renderReport() {
    lastView = 'report';
    const root = document.getElementById('rpRoot');
    if (!root) return;
    const r = computeReport();
    if (favSong && !r.songInfo[songIdentity(favSong)]) favSong = '';

    const tierText = t(r.tier);
    // 称号特别小标：全勤只显示最高级「👑 全程同行」，否则按达成追加「🌏 环球歌迷」「🇨🇳 神州全勤」
    const tierTags = r.fullTour
        ? t('report.tier.fulltour')
        : [r.hasOversea && t('report.tier.oversea'), r.fullDomestic && t('report.tier.china')].filter(Boolean).join(' · ');
    const headTitle = userName
        ? esc(t('report.title.named', { name: userName }))
        : esc(t('report.title.mine'));
    const defaultShareSolo = r.solo.length
        ? t('report.share.solo', { song: r.solo[0].song })
        : t('report.share.defaultSolo');
    const firstS = r.firstShow, lastS = r.lastShow;
    // 生成日期（本地时区，格式 2026.10.26）
    const now = new Date();
    const genDate = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');

    let html = stepsHTML(3);

    html += `<div class="rp-report-head">` +
        `<div class="rp-badges"><span class="rp-badge rp-badge-tier">${esc(tierText)}${tierTags ? ' · ' + esc(tierTags) : ''}</span></div>` +
        `<h3 class="rp-report-title">${headTitle}</h3>` +
        `<p class="rp-meta">${fullDate(firstS.date)} — ${fullDate(lastS.date)}</p>` +
        `</div>`;

    const daysUnit = t('report.stat.days');
    html += `<div class="rp-stats">` +
        `<div class="rp-stat"><b>${r.n}</b><span>${esc(t('report.stat.shows'))}</span></div>` +
        `<div class="rp-stat"><b>${r.m}</b><span>${esc(t('report.stat.cities'))}</span></div>` +
        `<div class="rp-stat"><b>${r.songCount}</b><span>${esc(t('report.stat.songs'))}</span></div>` +
        `<div class="rp-stat"><b>${r.spanDays}${daysUnit ? `<span style="font-size:13px"> ${esc(daysUnit)}</span>` : ''}</b><span>${esc(t('report.stat.span'))}</span></div>` +
        `</div>`;

    // 巡演时光轴（与「解锁城市」合并：不罗列城市，直接以时间轴呈现足迹）
    html += timelineHTML(r);

    // 观演里程：未填居住地时整节隐藏
    if (home && r.miles.rows.length) {
        const far = r.miles.rows[0], near = r.miles.rows[r.miles.rows.length - 1];
        html += `<div class="rp-sec"><h4 class="rp-sec-title">🧭 ${esc(t('report.sec.miles'))}</h4>` +
            `<div class="rp-miles-head">` +
            `<div class="rp-miles-big">≈ ${fmtKm(r.miles.total)}<small>km</small></div>` +
            `<div class="rp-miles-sub">${esc(t('report.miles.sub', { home: home.cn, m: r.m, n: r.n }))}</div>` +
            `<div class="rp-miles-extremes">` +
            `<span>${esc(t('report.miles.far'))} <b>${esc(far.city.replace(/站$/, ''))}</b> ${fmtKm(far.oneWay)} km</span>` +
            `<i class="rp-miles-ext-sep" aria-hidden="true"></i>` +
            `<span>${esc(t('report.miles.near'))} <b>${esc(near.city.replace(/站$/, ''))}</b> ${fmtKm(near.oneWay)} km</span>` +
            `</div>` +
            `<p class="rp-miles-slogan">${esc(t('report.miles.slogan'))}</p>` +
            `</div>` +
            `<div class="rp-miles-toggle">` +
            `<button type="button" class="rp-btn rp-btn-ghost" id="rpMilesToggle" aria-expanded="false">▾ ${esc(t('report.miles.more'))}</button>` +
            `</div>` +
            `<div class="rp-miles-rows" id="rpMilesRows" hidden>` +
            r.miles.rows.map(row =>
                `<div class="rp-row"><span class="rp-row-name">${esc(home.cn)} → ${esc(row.city.replace(/站$/, ''))}${row.emoji ? ' ' + row.emoji : ''}</span>` +
                `<span class="rp-row-where">${esc(t('report.miles.row', { n: row.cnt, km: fmtKm(row.round) }))}</span></div>`
            ).join('') + `</div></div>`;
    }

    if (r.themed.length) {
        html += `<div class="rp-sec"><h4 class="rp-sec-title">🎉 ${esc(t('report.sec.themed'))}</h4><div class="rp-chips-grid">` +
            r.themed.map(x => `<span class="rp-tag">${x.theme.emoji} ${esc(x.theme.name)} <small>· ${esc(x.where)}</small></span>`).join('') +
            `</div></div>`;
    }

    if (r.songCount) {
        const v = r.voice, vt = v.lam + v.sally + v.duet;
        // 旋律波形：细圆条按声部比例着色，高度沿固定波形图案起伏
        const segOf = vt
            ? (p) => p < v.lam / vt ? 'rp-voice-lam'
                : p < (v.lam + v.sally) / vt ? 'rp-voice-sally' : 'rp-voice-duet'
            : () => 'rp-voice-duet';
        const BARS = 180;
        let wave = '';
        for (let i = 0; i < BARS; i++) {
            const h = Math.min(100, Math.round(34 + 46 * Math.abs(Math.sin(i * .9)) + 18 * Math.abs(Math.sin(i * .33))));
            wave += `<i class="${segOf((i + .5) / BARS)}" style="height:${h}%; animation-delay:${(i % 12) * 70}ms"></i>`;
        }
        html += `<div class="rp-sec"><h4 class="rp-sec-title">💫 ${esc(t('report.sec.voices'))}</h4>` +
            `<div class="rp-wave" role="img" aria-label="${esc(t('report.voice.aria', { lam: v.lam, sally: v.sally, duet: v.duet }))}">${wave}</div>` +
            `<div class="rp-voice-legend">` +
            `<span><i class="rp-voice-dot rp-voice-lam"></i>${esc(t('report.voice.lam', { n: v.lam }))}</span>` +
            `<span><i class="rp-voice-dot rp-voice-sally"></i>${esc(t('report.voice.sally', { n: v.sally }))}</span>` +
            `<span><i class="rp-voice-dot rp-voice-duet"></i>${esc(t('report.voice.duet', { n: v.duet }))}</span>` +
            (v.guest ? `<span>${esc(t('report.voice.guest', { n: v.guest }))}</span>` : '') +
            `</div></div>`;
    }

    if (r.guestList.length) {
        html += `<div class="rp-sec"><h4 class="rp-sec-title">✨ ${esc(t('report.sec.guests'))}</h4><div class="rp-guests">` +
            r.guestList.map(g => `<div class="rp-guest"><span class="rp-guest-star">✦</span>` +
                `<div><span class="rp-guest-name">${esc(g.name)}</span>` +
                `<small class="rp-guest-where">${esc(g.where)}</small></div></div>`).join('') +
            `</div></div>`;
    }

    if (r.solo.length) {
        html += `<div class="rp-sec"><h4 class="rp-sec-title">💎 ${esc(t('report.sec.solo'))}</h4>` +
            `<p class="rp-sec-sub">${esc(t('report.solo.sub'))}</p><div class="rp-solo">` +
            r.solo.map(x =>
                `<div class="rp-solo-item"><span class="rp-solo-song">《${esc(x.song)}》</span>` +
                `<span class="rp-solo-where">${esc(x.where)}</span>` +
                `<span class="rp-rare-pill">1/${r.total} ${esc(t('report.unit.shows'))}</span></div>`
            ).join('') + `</div></div>`;
    } else {
        html += `<div class="rp-sec"><h4 class="rp-sec-title">💎 ${esc(t('report.sec.solo'))}</h4>` +
            `<div class="rp-empty">${esc(t('report.solo.empty'))}</div></div>`;
    }

    if (r.coverage.lib) {
        const c = r.coverage;
        html += `<div class="rp-sec"><h4 class="rp-sec-title">🎵 ${esc(t('report.sec.coverage'))}</h4>` +
            `<p class="rp-sec-sub">${esc(t('report.coverage.sub', { lib: c.lib, heard: c.heard }))}</p>` +
            `<div class="rp-cov-row"><div class="rp-cov-track"><div class="rp-cov-fill" style="width:${c.pct}%"></div></div>` +
            `<span class="rp-cov-pct">${c.pct}%</span></div>`;
        if (c.missing.length) {
            html += `<p class="rp-sec-sub" style="margin-top:12px">${esc(t('report.coverage.missing', { n: c.missing.length }))}</p>` +
                c.missing.slice(0, 8).map(x => {
                    const where = x.showCount === 1
                        ? t('report.coverage.where1', { city: x.cities[0], date: shortDate(x.date0) })
                        : t('report.coverage.whereN', {
                            cities: x.cities.slice(0, 2).join(' / ') + (x.cities.length > 2 ? t('report.coverage.etc') : '')
                        });
                    return `<div class="rp-row"><span class="rp-row-name">《${esc(x.name)}》</span>` +
                        `<span class="rp-row-where">${esc(where)}</span></div>`;
                }).join('') +
                (c.missing.length > 8
                    ? `<div class="rp-row"><span class="rp-row-where">${esc(t('report.coverage.more', { n: c.missing.length - 8 }))}</span></div>`
                    : '');
        } else {
            html += `<div class="rp-empty">${esc(t('report.coverage.done'))}</div>`;
        }
        html += `</div>`;
    }

    html += `<div class="rp-sec"><h4 class="rp-sec-title">🎧 ${esc(t('report.sec.bgm'))}</h4>` +
        `<p class="rp-sec-sub">${esc(t('report.bgm.sub', { k: r.songCount }))}</p>` +
        `<div class="rp-bgm-controls">` +
        `<div class="rp-dd" id="rpFavDD">` +
        `<button type="button" class="rp-select rp-dd-toggle${favSong ? ' is-set' : ''}" id="rpFav" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(t('report.bgm.aria'))}">` +
        `<span class="rp-dd-label">${favSong ? `《${esc(favSong)}》` : esc(t('report.bgm.placeholder'))}</span>` +
        `<svg class="rp-dd-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6.2 8 10.2l4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
        `</button>` +
        `<div class="rp-dd-panel" id="rpFavPanel" hidden>` +
        `<input type="text" class="rp-dd-search" id="rpFavSearch" autocomplete="off" placeholder="${esc(t('report.bgm.search'))}" aria-label="${esc(t('report.bgm.search'))}">` +
        `<div class="rp-dd-list" id="rpFavList" role="listbox" aria-label="${esc(t('report.bgm.aria'))}">` +
        r.songOrder.map(name =>
            `<button type="button" class="rp-dd-opt${favSong === name ? ' is-active' : ''}" role="option" aria-selected="${favSong === name}" data-value="${esc(name)}">《${esc(name)}》</button>`
        ).join('') +
        `</div>` +
        `<div class="rp-dd-empty" hidden>${esc(t('report.bgm.none'))}</div>` +
        `</div>` +
        `</div>` +
        `<button type="button" class="rp-btn rp-btn-ghost" id="rpShuffle" hidden>🔄 ${esc(t('report.bgm.shuffle'))}</button>` +
        `<input type="text" id="rpBgmCustom" class="rp-bgm-custom" maxlength="60" hidden placeholder="${esc(t('report.bgm.customPlaceholder'))}">` +
        `</div>` +
        `<div class="rp-bgm-result" id="rpFavResult" hidden>` +
        `<div class="rp-bgm-line" id="rpFavLine"></div>` +
        `<div class="rp-bgm-meta" id="rpFavMeta"></div>` +
        `</div>` +
        `</div>`;

    const unlocked = r.achievements.filter(a => a.on).length;
    html += `<div class="rp-sec"><h4 class="rp-sec-title">🏆 ${esc(t('report.sec.ach', { x: unlocked, t: r.achievements.length }))}</h4>` +
        ACH_GROUPS.map(g => {
            const list = r.achievements.filter(a => a.grp === g);
            if (!list.length) return '';
            return `<div class="rp-ach-grp">${esc(t(`report.ach.grp.${g}`))}</div>` +
                `<div class="rp-achs">` +
                list.map(a =>
                    `<div class="rp-ach${a.on ? ' is-on' : ''}"${a.on ? '' : ` title="${esc(t('report.ach.locked', { cond: a.cond }))}"`}>` +
                    `<div class="rp-ach-emoji">${a.on ? '✅ ' : ''}${a.emoji}</div>` +
                    `<div class="rp-ach-name">${esc(a.name)}</div>` +
                    `<div class="rp-ach-cond">${esc(a.cond)}</div></div>`
                ).join('') + `</div>`;
        }).join('') + `</div>`;

    html += `<div class="rp-quote"><p class="rp-quote-main">${esc(r.quote)}</p>` +
        `<p class="rp-quote-sign">${esc(t('report.quote.sign1'))}<br>${esc(t('report.quote.sign2'))}</p></div>`;

    const shareTop = userName
        ? esc(t('report.share.top.named', { name: userName }))
        : esc(t('report.share.top.mine'));
    html += `<div class="rp-share-wrap">` +
        `<div class="rp-msg-block">` +
        `<label class="rp-msg-label" for="rpMsg">${esc(t('report.msg.label'))}</label>` +
        `<textarea id="rpMsg" class="rp-msg-input" maxlength="${MSG_MAX}" rows="3" placeholder="${esc(t('report.msg.placeholder'))}"></textarea>` +
        `</div>` +
        `<div class="rp-sharecard" role="img" aria-label="${esc(t('report.share.aria'))}">` +
        `<div class="rp-sharecard-top">${shareTop}</div>` +
        `<div class="rp-sharecard-tier">${esc(tierText)}${tierTags ? ' · ' + esc(tierTags) : ''}</div>` +
        `<div class="rp-sharecard-nums">${esc(t('report.share.nums', { n: r.n, m: r.m, k: r.songCount }))}</div>` +
        (home && r.miles.rows.length
            ? `<div class="rp-sharecard-miles">${esc(t('report.share.miles', { km: fmtKm(r.miles.total) }))}</div>` : '') +
        `<div class="rp-sharecard-solo" id="rpShareSolo">${esc(defaultShareSolo)}</div>` +
        `<div class="rp-sharecard-msg" id="rpShareMsg" hidden></div>` +
        `<div class="rp-sharecard-foot">` +
        `<span class="rp-qr" id="rpQr" aria-hidden="true"></span>` +
        `<div class="rp-foot-txt"><span>${esc(t('report.share.foot1'))}</span><span>${esc(t('report.share.foot2'))}</span></div>` +
        `</div>` +
        `<div class="rp-sharecard-date">${esc(t('report.share.date', { date: genDate }))}</div>` +
        `</div>` +
        `<div class="rp-share-actions">` +
        `<button type="button" class="rp-btn rp-btn-primary" id="rpSave">${esc(t('report.share.image'))}</button>` +
        `<button type="button" class="rp-btn" id="rpSaveCard">${esc(t('report.share.cardImage'))}</button>` +
        `<button type="button" class="rp-btn" id="rpBack">↩️ ${esc(t('report.share.reselect'))}</button>` +
        `</div></div>`;

    html += `<p class="rp-foot">${esc(t('report.foot'))}</p>` +
        `<div class="rp-toast" id="rpToast" role="status" hidden></div>`;

    root.innerHTML = html;
    scrollRootTop();
    wireReport(r, defaultShareSolo);
}

// 懒加载二维码生成库（lib/qrcode.min.js，本地文件）
function ensureQrCode() {
    return new Promise((resolve, reject) => {
        if (typeof window.qrcode === 'function') return resolve(window.qrcode);
        const s = document.createElement('script');
        s.src = 'lib/qrcode.min.js';
        s.onload = () => typeof window.qrcode === 'function'
            ? resolve(window.qrcode)
            : reject(new Error('qrcode missing after load'));
        s.onerror = () => reject(new Error('qrcode load failed'));
        document.head.appendChild(s);
    });
}

// 懒加载 html2canvas（lib/html2canvas.min.js，本地文件，首次点保存时才加载）
function ensureHtml2canvas() {
    return new Promise((resolve, reject) => {
        if (window.html2canvas) return resolve(window.html2canvas);
        const s = document.createElement('script');
        s.src = 'lib/html2canvas.min.js';
        s.onload = () => window.html2canvas
            ? resolve(window.html2canvas)
            : reject(new Error('html2canvas missing after load'));
        s.onerror = () => reject(new Error('html2canvas load failed'));
        document.head.appendChild(s);
    });
}

// ---- 板块内滚动定位（innerHTML 大替换后浏览器滚动锚定不可靠，用确定性滚动）----
function scrollRootTop() {
    const root = document.getElementById('rpRoot');
    if (!root) return;
    const top = root.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
}

function wireReport(r, defaultShareSolo) {
    const root = document.getElementById('rpRoot');
    // 观演里程：各站明细默认折叠，展开按钮切换
    const milesToggle = root.querySelector('#rpMilesToggle');
    if (milesToggle) {
        const milesRows = root.querySelector('#rpMilesRows');
        milesToggle.addEventListener('click', () => {
            const collapse = !milesRows.hidden;   // 当前展开 → 点击后收起
            milesRows.hidden = collapse;
            milesToggle.setAttribute('aria-expanded', String(!collapse));
            milesToggle.textContent = (collapse ? '▾ ' : '▴ ') +
                t(collapse ? 'report.miles.more' : 'report.miles.less');
        });
    }
    // BGM 选歌联动（句式轮播 + 自定义句优先）；下拉为自定义弹层（原生 select 弹层不可定制，曲目多时难翻找）
    const favDD = root.querySelector('#rpFavDD');
    const favToggle = root.querySelector('#rpFav');
    const favLabel = favDD.querySelector('.rp-dd-label');
    const favPanel = root.querySelector('#rpFavPanel');
    const favSearch = root.querySelector('#rpFavSearch');
    const favList = root.querySelector('#rpFavList');
    const favEmpty = favDD.querySelector('.rp-dd-empty');
    const favResult = root.querySelector('#rpFavResult');
    const favLine = root.querySelector('#rpFavLine');
    const favMeta = root.querySelector('#rpFavMeta');
    const bgmTools = [root.querySelector('#rpShuffle'), root.querySelector('#rpBgmCustom')];
    const shareSoloEl = root.querySelector('#rpShareSolo');
    // 歌词金句在卡片上分两行：歌词独占首行，生成句换行展示（规则句式无「」引号，保持单行）
    const setShareSolo = (text) => {
        shareSoloEl.textContent = text.replace(/([」”])\s*(——|—)\s*/, '$1\n$2');
    };
    let ddValue = '';                          // 当前选中展示名（空 = 未选）
    function applyFav(save) {
        const song = ddValue;                  // 展示名（可能含首唱/装饰标记）
        const id = songIdentity(song);             // 曲目身份
        if (song && r.songInfo[id]) {
            favSong = song;
            favResult.hidden = false;
            bgmTools.forEach(el => { el.hidden = false; });
            applyLine();                       // 生成句同步写入预览框与分享卡片
        } else {
            favSong = '';
            favResult.hidden = true;
            bgmTools.forEach(el => { el.hidden = true; });
            setShareSolo(defaultShareSolo);
        }
        if (save) persist();
    }
    function applyLine() {
        const name = ddValue;
        const info = r.songInfo[songIdentity(name)];
        if (!info) return;
        favMeta.textContent = t('report.bgm.meta', {
            n: info.userShows, m: info.userCities.length, x: info.freq, t: r.total
        });
        if (bgmCustom) {
            favLine.textContent = bgmCustom;
            setShareSolo(bgmCustom);                // 自定义句 → 分享卡片
            return;
        }
        // 歌词金句优先（本地小文件通常即时返回）；返回前先以规则句式兜底，避免闪空
        const ruleLine = songLine(name, info, bgmVariant, r.total);
        const req = ++lyricReq;
        favLine.textContent = ruleLine;
        setShareSolo(ruleLine);                     // 规则句 → 分享卡片（同步兜底）
        lyricLine(name, bgmVariant).then(line => {
            if (req === lyricReq && !bgmCustom && line) {
                favLine.textContent = line;
                setShareSolo(line);                 // 歌词金句 → 分享卡片
            }
        });
    }
    // ---- 自定义下拉交互 ----
    function setFav(name, save) {
        ddValue = name;
        favToggle.classList.toggle('is-set', !!name);
        favLabel.textContent = name ? `《${name}》` : t('report.bgm.placeholder');
        favList.querySelectorAll('.rp-dd-opt').forEach(o => {
            const on = o.dataset.value === name;
            o.classList.toggle('is-active', on);
            o.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        applyFav(save);
    }
    const visibleOpts = () => Array.from(favList.querySelectorAll('.rp-dd-opt')).filter(o => !o.hidden);
    function filterFav(q) {
        q = q.trim().toLowerCase();
        let any = false;
        favList.querySelectorAll('.rp-dd-opt').forEach(o => {
            const hit = !q || o.dataset.value.toLowerCase().includes(q);
            o.hidden = !hit;
            if (hit) any = true;
        });
        favEmpty.hidden = any;
    }
    function openFavDD() {
        favPanel.hidden = false;
        favDD.classList.add('is-open');
        favToggle.setAttribute('aria-expanded', 'true');
        favSearch.value = '';
        filterFav('');
        const cur = favList.querySelector('.rp-dd-opt.is-active');
        if (cur) cur.scrollIntoView({ block: 'nearest' });
        // 桌面端聚焦搜索框便于直接输入；触屏设备不弹键盘，保持列表完整可见
        if (matchMedia('(hover: hover) and (pointer: fine)').matches) favSearch.focus();
    }
    function closeFavDD() {
        favPanel.hidden = true;
        favDD.classList.remove('is-open');
        favToggle.setAttribute('aria-expanded', 'false');
    }
    function stepFavFocus(cur, dir) {
        const opts = visibleOpts();
        if (!opts.length) return;
        const i = opts.indexOf(cur);
        opts[i === -1 ? (dir > 0 ? 0 : opts.length - 1) : (i + dir + opts.length) % opts.length].focus();
    }
    favToggle.addEventListener('click', () => (favPanel.hidden ? openFavDD() : closeFavDD()));
    favToggle.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openFavDD(); }
    });
    favSearch.addEventListener('input', () => filterFav(favSearch.value));
    favList.addEventListener('click', e => {
        const opt = e.target.closest('.rp-dd-opt');
        if (!opt) return;
        setFav(opt.dataset.value, true);
        closeFavDD();
        favToggle.focus();
    });
    [favSearch, favList].forEach(el => el.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.preventDefault(); closeFavDD(); favToggle.focus(); return; }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        stepFavFocus(e.target.closest('.rp-dd-opt'), e.key === 'ArrowDown' ? 1 : -1);
    }));
    // 点击弹层外关闭（重渲染时替换文档级监听，避免堆积）
    if (favDDOutside) document.removeEventListener('pointerdown', favDDOutside);
    favDDOutside = e => { if (!favDD.contains(e.target)) closeFavDD(); };
    document.addEventListener('pointerdown', favDDOutside);

    if (favSong) {
        // 恢复上次选择：优先精确匹配展示名，否则按曲目身份匹配
        const fid = songIdentity(favSong);
        const match = Array.from(favList.querySelectorAll('.rp-dd-opt')).find(o => songIdentity(o.dataset.value) === fid);
        if (match) setFav(match.dataset.value, false);
        else { favSong = ''; setShareSolo(defaultShareSolo); }  // 曲目已不在歌单：卡片回退默认文案
    }

    // 换一句：句式轮播（清空自定义句，回到系统句式）
    root.querySelector('#rpShuffle').addEventListener('click', () => {
        bgmVariant += 1;
        bgmCustom = '';
        root.querySelector('#rpBgmCustom').value = '';
        applyLine();
        persist();
    });
    // 分享卡片二维码（扫码直达线上报告页）
    ensureQrCode().then(() => {
        const qrEl = root.querySelector('#rpQr');
        if (!qrEl || typeof window.qrcode !== 'function') return;
        const qr = window.qrcode(0, 'M');
        qr.addData(REPORT_URL);
        qr.make();
        qrEl.innerHTML = qr.createSvgTag({ cellSize: 3, margin: 0 });
    }).catch(err => console.error('QR init failed:', err));

    // 自定义句（可选）→ 覆盖系统句式
    const customInput = root.querySelector('#rpBgmCustom');
    customInput.addEventListener('input', () => {
        bgmCustom = customInput.value.replace(/\s+/g, ' ').trim().slice(0, 60);
        applyLine();
        persist();
    });

    // 留言（可选）→ 实时印上分享卡片
    const msgInput = root.querySelector('#rpMsg');
    const msgCard = root.querySelector('#rpShareMsg');
    function applyMsg(save) {
        msgText = msgInput.value.replace(/\s+/g, ' ').trim().slice(0, MSG_MAX);
        if (msgText) {
            msgCard.innerHTML = esc(t('report.msg.to')) + '<br>「' + esc(msgText) + '」';
            msgCard.hidden = false;
        } else {
            msgCard.hidden = true;
        }
        if (save) persist();
    }
    msgInput.addEventListener('input', () => applyMsg(true));
    msgInput.addEventListener('change', () => applyMsg(true));
    if (msgText) {
        msgInput.value = msgText;
        applyMsg(false);
    }

    // 保存长图 / 保存卡片（html2canvas 懒加载；长图失败回退打印）与重选
    const toastEl = root.querySelector('#rpToast');
    let toastTimer = null;
    function toast(msg, ms) {
        toastEl.textContent = msg;
        toastEl.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms || 2600);
    }
    const safeName = (base) => ((userName ? userName + '的' : '') + base).replace(/[\\/:*?"<>|]/g, '');
    function exportImage(el, filename, opts, fallbackPrint) {
        toast(t('report.share.imgBusy'), 30000);
        return ensureHtml2canvas()
            .then(h2c => h2c(el, opts))
            .then(canvas => new Promise((resolve, reject) => {
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png');
            }))
            .then(blob => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(a.href), 4000);
                toast(t('report.share.imgDone'));
            })
            .catch(err => {
                console.error('Failed to export image:', err);
                toast(t('report.share.imgFail'));
                if (fallbackPrint) setTimeout(() => window.print(), 150);
            });
    }
    root.querySelector('#rpSave').addEventListener('click', () => {
        const btn = root.querySelector('#rpSave');
        btn.disabled = true;
        exportImage(root, safeName('观演回忆录.png'), {
            scale: 2,
            backgroundColor: '#F4FAFC',
            useCORS: true,
            ignoreElements: (el) => el.classList && (
                el.classList.contains('rp-msg-block') ||
                el.classList.contains('rp-share-actions') ||
                el.classList.contains('rp-toast'))
        }, true).finally(() => { btn.disabled = false; });
    });
    // 保存卡片：只导出当前生成的分享卡片（圆角外透明，不回退打印）
    root.querySelector('#rpSaveCard').addEventListener('click', () => {
        const card = root.querySelector('.rp-sharecard');
        if (!card) return;
        const btn = root.querySelector('#rpSaveCard');
        btn.disabled = true;
        exportImage(card, safeName('观演回忆卡片.png'), {
            scale: 2,
            backgroundColor: null,
            useCORS: true
        }, false).finally(() => { btn.disabled = false; });
    });
    root.querySelector('#rpBack').addEventListener('click', renderSelect);
}
