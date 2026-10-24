// js/tabs/setlist.js · 演出歌单 Tab：城市卡片选择器 + 歌单渲染 + 多日对比表差异高亮

import { setActive, setActiveTabButton, showContent, getContentEl } from './core.js';
import { bindBackToTop } from './content-utils.js';

// ==================== 日期解析（兼容三种格式） ====================
function parseDate(dateStr) {
    if (!dateStr) return null;

    // 逗号分隔的多日期: "2026-05-09, 2026-05-10, 2026-05-16"
    // 取最早为 startDate、最晚为 endDate，便于地图绿/蓝/红判定
    if (dateStr.includes(',')) {
        const dates = dateStr.split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(part => {
                const seg = part.split('-').map(Number);
                let y, m, d;
                if (seg.length === 3) {
                    [y, m, d] = seg;
                } else if (seg.length === 2) {
                    m = seg[0];
                    d = seg[1];
                    y = new Date().getFullYear();
                } else {
                    return null;
                }
                if (isNaN(y) || isNaN(m) || isNaN(d)) {
                    return null;
                }
                const dt = new Date(y, m - 1, d);
                if (dt.getMonth() !== m - 1 || dt.getDate() !== d) {
                    return null;
                }
                return dt;
            })
            .filter(Boolean);

        if (dates.length === 0) return null;
        return {
            startDate: new Date(Math.min(...dates)),
            endDate: new Date(Math.max(...dates))
        };
    }

    // 2. "至" 分隔的日期范围 / 单个日期: "2025-11-29 至 2025-12-01"
    const dateRange = dateStr.split('至');
    const startDateStr = dateRange[0].trim();
    const endDateStr = dateRange[1] ? dateRange[1].trim() : startDateStr;

    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);

    if (isNaN(startYear) || isNaN(startMonth) || isNaN(startDay)) {
        return null; // 无法解析日期
    }

    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = endYear && endMonth && endDay
        ? new Date(endYear, endMonth - 1, endDay)
        : startDate;

    return { startDate, endDate };
}

// 检查是否为待定项目（无有效日期或包含"未官宣"）
function isPendingEvent(event) {
    const dateInfo = parseDate(event.date);
    const hasValidDate = dateInfo !== null;
    return !hasValidDate;
}

// === 演出歌单（Tab 点击入口）===
export async function loadSetlistTab(btnSetlist) {
    const contentEl = getContentEl();
    setActiveTabButton(btnSetlist);
    setActive(btnSetlist);
    showContent();
    contentEl.innerHTML = `<div class="loading">${window.i18n.t("loading.setlist.cities")}</div>`;

    try {
        let itinerary = window.itineraryData;
        if (!itinerary) {
            const res = await fetch('data/json/itinerary.json');
            if (res.ok) {
                itinerary = await res.json();
                window.itineraryData = itinerary; // 缓存
            } else {
                throw new Error('Itinerary not found');
            }
        }
        renderSetlistSelector(itinerary);
    } catch (err) {
        contentEl.innerHTML = `<div class="error">${window.i18n.t("error.loadFailed")}</div>`;
    }
}

// 渲染歌单选择器的函数
function renderSetlistSelector(itinerary) {
    const contentEl = getContentEl();
    // 过滤掉待定项目（无有效日期或包含"未官宣"）
    const validItinerary = itinerary.filter(event => !isPendingEvent(event));

    // 生成城市卡片（状态色与地图图例一致）
    const statusOf = (event) => {
        if (event.name.includes('未官宣')) return 'tbd';
        const d = parseDate(event.date);
        if (!d) return 'tbd';
        const today = window.getToday(); // app.js 提供
        if (d.endDate < today) return 'done';
        if (d.startDate <= today && today <= d.endDate) return 'doing';
        return 'todo';
    };

    let cardsHtml = '';
    validItinerary.forEach((event, index) => {
        let setlistName = event['setlist-name'] || `_0${index + 1}_${event.city.replace('（未官宣）', '').replace(' ', '')}`;
        setlistName = setlistName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const st = statusOf(event);
        const nameMatch = event.name.match(/^(#\d+)\s+([^\sA-Za-z]+)\s*(.*)$/);
        const nameCn = nameMatch ? `${nameMatch[1]} ${nameMatch[2]}` : event.name;
        const nameEn = nameMatch ? nameMatch[3].trim() : '';
        const dateLines = event.date.split(/[,，]/).map(d => d.trim()).filter(Boolean)
            .map(d => {
                const range = d.split(/\s*至\s*/);
                return range.length === 2 ? `${range[0]}<br>至 ${range[1]}` : d;
            }).join('<br>');
        cardsHtml += `
            <div class="city-card" data-status="${st}" data-value="${setlistName}" data-index="${itinerary.findIndex(item => item === event)}">
                <div class="name"><i class="st-${st}"></i><span class="name-lines"><span class="cn">${nameCn}</span><span class="en">${nameEn}</span></span></div>
                <div class="date">${dateLines}</div>
            </div>`;
    });

    contentEl.innerHTML = `
        <div class="filter-chips">
            <button class="chip on" data-filter="all">${window.i18n.t("filter.all")}</button>
            <button class="chip" data-filter="done">${window.i18n.t("map.legend.finished")}</button>
            <button class="chip" data-filter="doing">${window.i18n.t("map.legend.ongoing")}</button>
            <button class="chip" data-filter="todo">${window.i18n.t("map.legend.upcoming")}</button>
        </div>
        <div class="city-grid">${cardsHtml}</div>
        <div id="songListContent" style="margin-top: 16px;"></div>
    `;

    const songListContent = document.getElementById('songListContent');
    const defaultHtml = `
        <div class="setlist-welcome">
            <img src="./img/data/meiyechangbuting.png" alt="每夜唱不停 · Lam" class="reveal in">
            <img src="./img/data/wanfeng.png" alt="晚风 · Sally" class="reveal in">
        </div>
    `;
    songListContent.innerHTML = defaultHtml;

    bindBackToTop();

    contentEl.querySelector('.filter-chips').addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        contentEl.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
        chip.classList.add('on');
        const f = chip.dataset.filter;
        contentEl.querySelectorAll('.city-card').forEach(card => {
            card.style.display = (f === 'all' || card.dataset.status === f) ? '' : 'none';
        });

        // 当前选中的卡片在新筛选下不可见时，重置歌单详情为初始状态
        const pickedCard = contentEl.querySelector('.city-card.picked');
        if (pickedCard && pickedCard.style.display === 'none') {
            pickedCard.classList.remove('picked');
            songListContent.innerHTML = defaultHtml;
        }
    });

    contentEl.querySelector('.city-grid').addEventListener('click', async (e) => {
        const card = e.target.closest('.city-card');
        if (!card) return;
        contentEl.querySelectorAll('.city-card').forEach(c => c.classList.remove('picked'));
        card.classList.add('picked');

        const selectedValue = card.dataset.value;
        const selectedIndex = card.dataset.index;

        if (!selectedValue) {
            songListContent.innerHTML = defaultHtml;
            return;
        }

        songListContent.innerHTML = `<div class="loading">${window.i18n.t("loading.setlist.songs")}</div>`;

        try {
            const htmlPath = `./data/setlist/${selectedValue}.html`;
            const mdPath = `./data/setlist/${selectedValue}.md`;

            let html = '';
            // 使用原始索引找到原始事件对象
            const eventInfo = itinerary[parseInt(selectedIndex)];

            // 尝试加载 HTML
            let resp = await fetch(htmlPath, {headers: {'Cache-Control': 'no-cache'}});
            if (resp.ok) {
                html = await resp.text();
                if (!html.trim()) throw new Error('HTML file empty');
            } else {
                // 回退到 Markdown
                resp = await fetch(mdPath, {headers: {'Cache-Control': 'no-cache'}});
                if (resp.ok) {
                    const mdText = await resp.text();
                    if (!mdText.trim()) throw new Error('Markdown file empty');
                    html = marked.parse(mdText);
                } else {
                    const isUnofficial = eventInfo?.city?.includes('（未官宣）') || !eventInfo?.['setlist-name'];
                    throw Object.assign(new Error('Setlist file not published'), {
                        code: 'FILE_NOT_PUBLISHED',
                        unofficial: isUnofficial
                    });
                }
            }

            // 渲染演出信息（主题横幅头 + 键值网格）+ 歌单
            const dInfo = parseDate(eventInfo.date);
            let stClass = 'ci-tbd', stKey = 'map.status.pending';
            if (dInfo) {
                const today = window.getToday(); // app.js 提供
                if (dInfo.endDate < today) { stClass = 'ci-done'; stKey = 'map.status.finished'; }
                else if (dInfo.startDate <= today && today <= dInfo.endDate) { stClass = 'ci-doing'; stKey = 'map.status.ongoing'; }
                else { stClass = 'ci-todo'; stKey = 'map.status.upcoming'; }
            }
            const stopNo = (eventInfo.name.match(/#(\d+)/) || [])[1] || '—';

            songListContent.innerHTML = `
                <div class="city-info">
                    <div class="ci-head">
                        <span class="ci-title">🎤 ${eventInfo.name}</span>
                        <span class="ci-sub">${window.i18n.t("setlist.info.subtitle")}</span>
                    </div>
                    <div class="ci-grid">
                        <div class="ci-cell"><div class="ci-k">${window.i18n.t("setlist.info.venue")}</div><div class="ci-v">${eventInfo.location}</div></div>
                        <div class="ci-cell"><div class="ci-k">${window.i18n.t("setlist.info.date")}</div><div class="ci-v">${eventInfo.date}</div></div>
                        <div class="ci-cell"><div class="ci-k">${window.i18n.t("setlist.info.location")}</div><div class="ci-v">${eventInfo.province} ${eventInfo.city}</div></div>
                        <div class="ci-cell"><div class="ci-k">${window.i18n.t("setlist.info.status")}</div><div class="ci-v ${stClass}">${window.i18n.t(stKey).replace(/^\P{L}+/u, '').trim()}</div></div>
                        <div class="ci-cell"><div class="ci-k">${window.i18n.t("setlist.info.songs")}</div><div class="ci-v ci-v-songs">…</div></div>
                        <div class="ci-cell"><div class="ci-k">${window.i18n.t("setlist.info.progress")}</div><div class="ci-v">#${stopNo} / ${itinerary.length} ${window.i18n.t("setlist.info.stopUnit")}</div></div>
                    </div>
                </div>
                <div class="content-body">${html}</div>
            `;

            // 填充歌单组数：按组曲计，单城市多场次全部展示（须在 enhance 之后，表格才有 .setlist-table 标记）
            const fillSongsCount = () => {
                const songsCell = songListContent.querySelector('.ci-v-songs');
                if (!songsCell) return;
                const labelHeader = songListContent.querySelector('.setlist-table tr.label-header');
                let groups = labelHeader ? labelHeader.children.length / 3 : 1;
                if (!Number.isInteger(groups) || groups < 1) groups = 1;
                const rows = [];
                songListContent.querySelectorAll('.setlist-table tr').forEach(tr => {
                    if (tr.classList.contains('date-header') || tr.classList.contains('label-header') || tr.classList.contains('chapter-row')) return;
                    rows.push(tr.children);
                });
                const counts = [];
                for (let g = 0; g < groups; g++) {
                    let count = 0;
                    rows.forEach(tds => {
                        // 只取数字序号行：如重庆「彩蛋」等非序号行不计入
                        const no = tds[g * 3];
                        if (no && /^\d+$/.test((no.textContent || '').trim())) count++;
                    });
                    if (count) counts.push(count);
                }
                songsCell.textContent = counts.length
                    ? `${counts.join(' / ')} ${window.i18n.t("setlist.info.songUnit")}`
                    : window.i18n.t("setlist.info.collected");
            };
            enhanceCompareTables(songListContent);
            fillSongsCount();
        } catch (err) {
            console.error('Setlist load error:', err);
            if (err.code === 'FILE_NOT_PUBLISHED') {
                songListContent.innerHTML = `
                    <div class="warning">
                        ${err.unofficial
                    ? window.i18n.t("setlist.unofficial")
                    : window.i18n.t("setlist.fileNotPublished")
                }
                    </div>
                `;
            } else if (err.message?.includes('fetch')) {
                songListContent.innerHTML = `<div class="error">${window.i18n.t("error.network")}</div>`;
            } else {
                songListContent.innerHTML = `<div class="error">${window.i18n.t("error.setlist.loadFailed")}</div>`;
            }
        }
    });
}

// 差异比较前归一化歌名：括号内的版别/说明（如「黄包车版」「国」）不参与比较
function normalizeSongName(name) {
    return name.replace(/[（(][^）)]*[）)]/g, '').trim();
}

// 歌单主表打标：.setlist-table 类 + 演唱人胶囊 td.sg.lam/.sally/.both（数据文件零改动）
function tagSetlistTable(table) {
    table.classList.add('setlist-table');
    table.querySelectorAll('tr').forEach(tr => {
        if (tr.classList.contains('date-header') || tr.classList.contains('label-header') || tr.classList.contains('chapter-row')) return;
        const tds = tr.querySelectorAll('td');
        for (let i = 2; i < tds.length; i += 3) {
            const td = tds[i];
            const singer = (td.textContent || '').trim();
            if (!singer) continue;
            td.classList.add('sg');
            if (singer.includes('&')) td.classList.add('both');
            else if (/Lam|林子祥/i.test(singer)) td.classList.add('lam');
            else if (/Sally|叶蒨文/i.test(singer)) td.classList.add('sally');
        }
    });
}

// 歌单容器增强：剥离开数据自带的 <link>、包裹表格、打标、绑定差异高亮开关
// （同时供 app.js 的地图点击歌单流程通过 window.enhanceCompareTables 调用，见 main.js）
export function enhanceCompareTables(container) {
    // 数据文件自带的 <link> 剥离：相关 CSS 已由 index.html 统一引入（带版本号），
    // 避免注入 link 触发浏览器启发式缓存导致样式版本不一致
    container.querySelectorAll('link').forEach(link => link.remove());

    container.querySelectorAll('table').forEach(table => {
        const labelHeader = table.querySelector('tr.label-header');
        if (labelHeader) tagSetlistTable(table);

        if (!table.closest('.table-scroll')) {
            const wrap = document.createElement('div');
            wrap.className = labelHeader ? 'table-scroll sl-wrap' : 'table-scroll';
            table.parentNode.insertBefore(wrap, table);
            wrap.appendChild(table);
        } else if (labelHeader) {
            table.parentElement.classList.add('sl-wrap');
        }

        if (!labelHeader) return;
        const groups = labelHeader.children.length / 3;
        if (!Number.isInteger(groups) || groups < 2) return;

        const wrap = table.closest('.table-scroll') || table;
        const toggle = document.createElement('div');
        toggle.className = 'diff-toggle';
        toggle.innerHTML = `<label><input type="checkbox"> ${window.i18n.t('setlist.diffHighlight')}</label>`;
        wrap.parentNode.insertBefore(toggle, wrap);

        // 预收集歌曲行，并按场次建立归一化歌名全集：
        // 某曲目只要在其他任意场次出现过（不论顺序），即视为「两场都有」，不算差异
        const songRows = [];
        table.querySelectorAll('tr').forEach(tr => {
            if (tr.classList.contains('date-header') || tr.classList.contains('label-header') || tr.classList.contains('chapter-row')) return;
            const tds = tr.querySelectorAll('td');
            if (tds.length < groups * 3) return;
            songRows.push({ tr, tds });
        });
        const showSets = [];
        for (let g = 0; g < groups; g++) {
            const set = new Set();
            songRows.forEach(({ tds }) => {
                const cell = tds[g * 3 + 1];
                const name = cell ? normalizeSongName(cell.textContent.trim()) : '';
                if (name) set.add(name);
            });
            showSets.push(set);
        }

        const checkbox = toggle.querySelector('input');
        checkbox.addEventListener('change', () => {
            const on = checkbox.checked;
            songRows.forEach(({ tr, tds }) => {
                let rowDiff = false;
                for (let g = 0; g < groups; g++) {
                    const cell = tds[g * 3 + 1];
                    const name = cell ? normalizeSongName(cell.textContent.trim()) : '';
                    // 独有曲目 = 本场有、且其余任一场的全集里没有
                    const unique = !!name && showSets.some((set, g2) => g2 !== g && !set.has(name));
                    if (cell) cell.classList.toggle('cell-diff', on && unique);
                    if (unique) rowDiff = true;
                }
                tr.classList.toggle('row-diff', on && rowDiff);
            });
        });
    });

    // 舞台变化点整体折叠（默认折叠；歌单主表不参与，参考目录 h3 仅作为折叠边界）
    wrapChangePoints(container);
    // 参考目录不渲染标题栏：移除 h3，表格以自身外框直接跟在区块后展示
    removeReferenceTocHead(container);
}

// 清掉元素紧邻上方的 <br/> 与空白文本节点（数据文件用 br 充当旧版式的间距手段）
function stripPrecedingBreaks(el) {
    let n = el.previousSibling;
    while (n) {
        if (n.nodeType === Node.ELEMENT_NODE && n.tagName === 'BR') {
            const prev = n.previousSibling;
            n.remove();
            n = prev;
        } else if (n.nodeType === Node.TEXT_NODE && !n.textContent.trim()) {
            const prev = n.previousSibling;
            n.remove();
            n = prev;
        } else break;
    }
}

// 「参考目录」不再单独渲染标题栏：h3 直接移除，区块标识交给表格自身的列头
function removeReferenceTocHead(container) {
    container.querySelectorAll('h3').forEach(h3 => {
        if (!(h3.textContent || '').includes('参考目录')) return;
        if (h3.closest('.cp-head')) return;
        stripPrecedingBreaks(h3);
        h3.remove();
    });
}

// ==================== 舞台变化点折叠 ====================
// 把 <h3>舞台变化点</h3> 到 <h3>参考目录</h3>（或容器末尾）之间的内容
// 包进 .cp-section 折叠容器：h3 变为可点击头部，默认收起，数据文件零改动
function wrapChangePoints(container) {
    const h3s = Array.from(container.querySelectorAll('h3'));
    const start = h3s.find(h => (h.textContent || '').includes('舞台变化点'));
    if (!start || start.closest('.cp-section')) return;
    const end = h3s.find(h => h !== start && (h.textContent || '').includes('参考目录'));
    const parent = start.parentNode;
    if (!parent) return;

    // 收集头部之后、边界（参考目录）之前的所有节点（含文本节点，总体说明为纯文本）
    const bodyNodes = [];
    let node = start.nextSibling;
    while (node && node !== end) {
        bodyNodes.push(node);
        node = node.nextSibling;
    }

    const section = document.createElement('div');
    section.className = 'cp-section is-collapsed';

    // 数据文件在标题前后放置的 <br/> 是旧版式的间距手段，
    // 新版式由区块外边距承担，清掉紧邻的空行避免出现大段死空间
    stripPrecedingBreaks(start);
    if (end) stripPrecedingBreaks(end);

    const head = document.createElement('div');
    head.className = 'cp-head';
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    head.setAttribute('aria-expanded', 'false');

    const meta = document.createElement('span');
    meta.className = 'cp-meta';

    const arrow = document.createElement('span');
    arrow.className = 'cp-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '▾';

    const clip = document.createElement('div');
    clip.className = 'cp-clip';
    clip.setAttribute('aria-hidden', 'true');
    const body = document.createElement('div');
    body.className = 'cp-body';

    section.append(head, clip);
    clip.appendChild(body);
    // 先插入 section（此时 h3 仍在原位，可作定位锚点），再把 h3、摘要与内容移入
    parent.insertBefore(section, start);
    head.append(start, meta, arrow);
    body.append(...bodyNodes);
    // 节点移入后再统计（表格可能已被包进 .table-scroll，需从 body 整体查询）
    meta.textContent = buildChangePointsMeta(body);
    // 重排为方案A版式：总体块表 + 每章一张表（章节行入表、列头移入表体）
    rebuildChangePoints(body);

    const toggle = () => {
        const collapsed = section.classList.toggle('is-collapsed');
        head.setAttribute('aria-expanded', String(!collapsed));
        if (collapsed) {
            clip.setAttribute('aria-hidden', 'true');
            clip.style.height = '0px';
        } else {
            clip.removeAttribute('aria-hidden');
            clip.style.height = clip.scrollHeight + 'px';
        }
        // 过渡结束后清掉 inline 高度交还 auto，内容后续增高（如图片加载）不受限
        clearTimeout(clip.__cpTimer);
        const settle = () => {
            clip.removeEventListener('transitionend', settle);
            if (!section.classList.contains('is-collapsed')) clip.style.height = '';
        };
        clip.addEventListener('transitionend', settle);
        clip.__cpTimer = setTimeout(settle, 450); // reduced-motion 等场景下 transitionend 不触发的兜底
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
        }
    });
}

// 折叠头部摘要：总体 + N 个章节 · M 条变化点（无表格时退化为纯说明文案）
function buildChangePointsMeta(root) {
    let chapters = 0;
    root.querySelectorAll(':scope > strong').forEach(n => {
        const text = (n.textContent || '').trim();
        if (/^Chapter/i.test(text) || /^Encore/i.test(text)) chapters++;
    });
    const rows = root.querySelectorAll('tbody tr').length;

    if (chapters > 0 && rows > 0) {
        return window.i18n.t('setlist.cp.metaChapters', { n: chapters, m: rows });
    }
    if (rows > 0) return window.i18n.t('setlist.cp.metaRows', { m: rows });
    return window.i18n.t('setlist.cp.metaNotes');
}

// ==================== 变化点版式（方案A · 分章 · 歌单同款） ====================
// 把「总体说明 + ChapterN： + 对比表」的平铺结构重排为：
// 总体块表（绿章行 + 纯文本格） + 每章一张表（表首为绿色章节行，列头行随其后）；
// 无章节标签的表格与零散节点按原样兜底保留。
function rebuildChangePoints(body) {
    const nodes = Array.from(body.childNodes);
    const isEl = n => n.nodeType === Node.ELEMENT_NODE;
    const textOf = n => (n.textContent || '').trim();
    const isChapterStrong = n => isEl(n) && n.tagName === 'STRONG' && /^(Chapter|Encore)/i.test(textOf(n));
    const isOverallStrong = n => isEl(n) && n.tagName === 'STRONG' && /^总体/.test(textOf(n));
    // 表格可能被包在 .table-scroll 里（enhanceCompareTables 所为）
    const tableIn = n => {
        if (!isEl(n)) return null;
        if (n.tagName === 'TABLE') return n;
        if (n.classList.contains('table-scroll')) return n.querySelector('table');
        return null;
    };

    const consumed = new Set();
    const chapterNameByTable = new Map();

    // 总体块：总体 strong 起到第一个章节 strong / 表格止
    let overallHtml = '';
    const overallStrong = nodes.find(isOverallStrong);
    if (overallStrong) {
        consumed.add(overallStrong);
        const parts = [];
        for (let i = nodes.indexOf(overallStrong) + 1; i < nodes.length; i++) {
            const n = nodes[i];
            if (tableIn(n) || isChapterStrong(n)) break;
            parts.push(n);
            consumed.add(n);
        }
        while (parts.length && isEl(parts[0]) && parts[0].tagName === 'BR') parts.shift();
        while (parts.length && isEl(parts[parts.length - 1]) && parts[parts.length - 1].tagName === 'BR') parts.pop();
        overallHtml = parts.map(n => isEl(n) ? n.outerHTML : n.textContent).join('').trim();
    }

    // 章节：strong 标签与其后第一个表格配对，中间的 br / 非空白文本丢弃
    nodes.forEach((n, i) => {
        if (!isChapterStrong(n)) return;
        consumed.add(n);
        for (let j = i + 1; j < nodes.length; j++) {
            const m = nodes[j];
            const t = tableIn(m);
            if (t) { chapterNameByTable.set(t, textOf(n).replace(/[：:]\s*$/, '')); break; }
            if (isChapterStrong(m) || isOverallStrong(m)) break;
            if (isEl(m) || textOf(m)) consumed.add(m);
        }
    });

    const out = [];
    if (overallHtml) {
        const wrap = document.createElement('div');
        wrap.className = 'table-scroll';
        const table = document.createElement('table');
        table.className = 'compare-table cp-overall';
        table.innerHTML = `<tbody><tr class="cp-chapter-row"><td>总体</td></tr>` +
            `<tr class="cp-plain-row"><td class="cp-plain-cell">${overallHtml}</td></tr></tbody>`;
        wrap.appendChild(table);
        out.push(wrap);
    }
    nodes.forEach(n => {
        const t = tableIn(n);
        if (t && chapterNameByTable.has(t)) {
            prependChangePointsHeader(t, chapterNameByTable.get(t));
            colorizeChangeColumn(t);
            out.push(n); // n 为 .table-scroll 包裹层或表格本身
        }
    });
    // 未识别的零散节点按原顺序兜底保留（空白文本与 br 除外）
    nodes.forEach(n => {
        if (consumed.has(n) || out.includes(n)) return;
        const t = tableIn(n);
        if (t) { if (!chapterNameByTable.has(t)) out.push(n); return; }
        if (isEl(n)) { if (n.tagName !== 'BR') out.push(n); return; }
        if (textOf(n)) out.push(n);
    });

    body.replaceChildren(...out);
}

// 列头行自 thead 移入 tbody（标记 cp-head-row），表首插入绿色章节行
function prependChangePointsHeader(table, name) {
    const tbody = table.tBodies[0];
    if (!tbody) return;
    const thead = table.tHead;
    let colCount = 4;
    if (thead) {
        const headRows = Array.from(thead.rows);
        if (headRows.length) colCount = headRows[0].cells.length || colCount;
        headRows.reverse().forEach(tr => {
            tr.classList.add('cp-head-row');
            tbody.insertBefore(tr, tbody.firstChild);
        });
        thead.remove();
    }
    const tr = document.createElement('tr');
    tr.className = 'cp-chapter-row';
    const td = document.createElement('td');
    td.colSpan = colCount;
    td.textContent = name;
    tr.appendChild(td);
    tbody.insertBefore(tr, tbody.firstChild);
}

// 变化点列按类型着色（呼应歌单演唱人的纯色文字语言），未知类型退化为灰字
const CP_TV_RULES = [
    [/灯光|灯效/, 'tv-light'],
    [/新曲/, 'tv-new'],
    [/舞美/, 'tv-screen'],
    [/狗粮|求婚/, 'tv-dog'],
    [/Talking/i, 'tv-talk'],
    [/伴舞/, 'tv-dance'],
    [/妆造|妆发/, 'tv-makeup']
];
function colorizeChangeColumn(table) {
    table.querySelectorAll('tbody tr').forEach(tr => {
        if (tr.classList.contains('cp-chapter-row') || tr.classList.contains('cp-head-row')) return;
        const td = tr.cells[1];
        if (!td) return;
        const raw = (td.textContent || '').trim();
        if (raw === '-') {
            td.classList.add('cp-dash');
            return;
        }
        if (!raw) return;
        const tokens = raw.split(/[、，,]/).map(s => s.trim()).filter(Boolean);
        td.textContent = '';
        tokens.forEach((tok, i) => {
            if (i) {
                const sep = document.createElement('span');
                sep.className = 'tv-sep';
                sep.textContent = ' · ';
                td.appendChild(sep);
            }
            const span = document.createElement('span');
            const hit = CP_TV_RULES.find(([re]) => re.test(tok));
            span.className = 'tv ' + (hit ? hit[1] : 'tv-talk');
            span.textContent = tok;
            td.appendChild(span);
        });
    });
}
