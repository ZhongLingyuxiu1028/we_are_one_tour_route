// js/tabs.js

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

if (location.hash === '#map') {
    history.replaceState(null, '', location.pathname + location.search);
}

window.addEventListener('load', () => {
    if (!location.hash || location.hash === '#map') {
        window.scrollTo(0, 0);
    }
});

// 全局变量：记录当前激活的非地图 tab 按钮
window.activeTabButton = null;

// 全局函数：重新加载当前激活的 tab（用于语言切换后刷新内容）
window.reloadActiveTab = function () {
    if (window.activeTabButton) {
        // 使用 setTimeout 确保 DOM 和 i18n 状态稳定后再触发
        setTimeout(() => {
            window.activeTabButton.click();
        }, 50);
    }
};

document.addEventListener('i18nReady', () => {
    const mapEl = document.getElementById('map');
    const contentEl = document.getElementById('content');

    // 按钮元素
    const btnChina = document.getElementById('btnChina');
    const btnWorld = document.getElementById('btnWorld');
    const btnDiary = document.getElementById('btnDiary');
    const btnSonglist = document.getElementById('btnSonglist');
    const btnSetlist = document.getElementById('btnSetlist');
    const btnCredits = document.getElementById('btnCredits');
    const btnBonus = document.getElementById('btnBonus');
    const btnAbout = document.getElementById('btnAbout');

    // 所有控制按钮
    // const allButtons = [btnChina, btnWorld, btnDiary, btnSonglist, btnSetlist, btnCredits, btnBonus, btnAbout];
    const allButtons = [btnChina, btnWorld, btnSonglist, btnSetlist, btnCredits, btnBonus, btnAbout];

    const TAB_HASH = {
        btnChina: 'map',
        btnWorld: 'map',
        btnSonglist: 'songlist',
        btnSetlist: 'setlist',
        btnCredits: 'credits',
        btnBonus: 'bonus',
        btnAbout: 'about'
    };

    function setActive(button) {
        allButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
        const navLink = document.querySelector(`.nav a[data-goto-tab="${button.id}"]`)
            || (TAB_HASH[button.id] === 'map' ? document.querySelector('.nav a[data-scroll="#map-section"]') : null);
        if (navLink) navLink.classList.add('active');

        const hashName = TAB_HASH[button.id];
        if (hashName) history.replaceState(null, '', '#' + hashName);
    }

    function showMap() {
        contentEl.style.display = 'none';
        contentEl.classList.remove('show');

        const btn = document.getElementById('backToTopBtn');
        if (btn) btn.classList.remove('show');
    }

    function showContent() {
        contentEl.style.display = 'block';
        contentEl.classList.remove('show');
        void contentEl.offsetWidth;
        contentEl.classList.add('show');

        const hall = document.getElementById('hall');
        if (hall) {
            suspendSpy();
            hall.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // 先记录 URL hash，再执行默认激活（setActive 会改写 hash）
    const initialHash = location.hash.replace('#', '');

    // 默认显示地图（中国地图）
    setActive(btnChina);
    showMap();

    // 顶栏导航与 CTA：data-goto-tab 触发对应展厅按钮，data-scroll 平滑滚动到目标板块
    document.querySelectorAll('[data-goto-tab]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById(el.getAttribute('data-goto-tab'));
            if (target) target.click();
        });
    });
    document.querySelectorAll('[data-scroll]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(el.getAttribute('data-scroll'));
            if (target) {
                suspendSpy();
                target.scrollIntoView({ behavior: 'smooth' });
            }
            document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
            const mapNav = document.querySelector('.nav a[data-scroll="#map-section"]');
            if (mapNav) mapNav.classList.add('active');
            history.replaceState(null, '', '#map');
        });
    });

    // 左上角标题：平滑回到页面顶部
    const brand = document.querySelector('a.brand');
    if (brand) {
        brand.addEventListener('click', (e) => {
            e.preventDefault();
            suspendSpy();
            history.replaceState(null, '', '#top');
            syncNavActive(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ==================== 滚动监听（scroll-spy）：URL 锚点 / 导航高亮跟随滚动位置 ====================
    // 规则：
    //  - 命中板块 = 触发线（视口上部 35%）以上最后一个板块
    //  - 位于地图板块 → #map；位于内容展厅且 Tab 打开 → 对应 Tab 锚点；其余 → 各自板块锚点
    //  - 编程式平滑滚动期间挂起，滚动静止后恢复；用户滚轮/触摸/按键介入时立即恢复
    const spySections = [
        { id: 'top', hash: 'top' },
        { id: 'stats', hash: 'stats' },
        { id: 'map-section', hash: 'map', nav: '.nav a[data-scroll="#map-section"]' },
        { id: 'hall', hash: 'hall' }
    ].map(s => Object.assign(s, { el: document.getElementById(s.id) }));

    let spySuspended = false;
    let spySettleTimer = null;
    let spyRafPending = false;

    function isContentVisible() {
        return !!contentEl && contentEl.style.display !== 'none';
    }

    function syncNavActive(selector) {
        document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
        if (selector) {
            const el = document.querySelector(selector);
            if (el) el.classList.add('active');
        }
    }

    function updateHashFromScroll() {
        const line = window.innerHeight * 0.35;
        let current = spySections[0];
        for (const s of spySections) {
            if (s.el && s.el.getBoundingClientRect().top <= line) current = s;
        }

        let hash = current.hash;
        let navSelector = current.nav || null;

        // 内容展厅内：锚点与导航高亮跟随当前激活的 Tab
        if (current.id === 'hall' && isContentVisible()) {
            const activeBtn = document.querySelector('.tabs-bar button.active');
            const tabHash = activeBtn && TAB_HASH[activeBtn.id];
            if (tabHash && tabHash !== 'map') {
                hash = tabHash;
                navSelector = `.nav a[data-goto-tab="${activeBtn.id}"]`;
            }
        }

        if (('#' + hash) !== location.hash) {
            history.replaceState(null, '', '#' + hash);
        }
        syncNavActive(navSelector);
    }

    function suspendSpy() {
        spySuspended = true;
        clearTimeout(spySettleTimer);
        spySettleTimer = setTimeout(() => {
            spySuspended = false;
            updateHashFromScroll();
        }, 150);
    }

    function onSpyScroll() {
        if (spySuspended) {
            // 编程式滚动进行中：滚动静止一小段时间后再恢复
            clearTimeout(spySettleTimer);
            spySettleTimer = setTimeout(() => {
                spySuspended = false;
                updateHashFromScroll();
            }, 150);
            return;
        }
        if (spyRafPending) return;
        spyRafPending = true;
        requestAnimationFrame(() => {
            spyRafPending = false;
            updateHashFromScroll();
        });
    }

    window.addEventListener('scroll', onSpyScroll, { passive: true });
    window.addEventListener('resize', () => {
        if (!spySuspended) updateHashFromScroll();
    }, { passive: true });
    ['wheel', 'touchstart', 'keydown'].forEach(ev =>
        window.addEventListener(ev, () => { spySuspended = false; }, { passive: true })
    );

    window.ScrollSpy = { suspend: suspendSpy, update: updateHashFromScroll };

    // === 地图按钮（不参与内容重载）===
    btnChina.addEventListener('click', () => {
        setActive(btnChina);
        showMap();
        if (window.switchMap) window.switchMap('china');
        window.activeTabButton = null; // 清除激活 tab
    });

    btnWorld.addEventListener('click', () => {
        setActive(btnWorld);
        showMap();
        if (window.switchMap) window.switchMap('world');
        window.activeTabButton = null;
    });

    // === 内容型 Tab：统一处理逻辑 ===
    const loadMarkdownTab = async (button, filePath, loadingKey, errorKey = "error.loadFailed") => {
        window.activeTabButton = button;
        setActive(button);
        showContent();
        contentEl.innerHTML = `<div class="loading">${i18n.t(loadingKey)}</div>`;

        try {
            const response = await fetch(filePath);
            if (response.ok) {
                const text = await response.text();
                const html = marked.parse(text);
                contentEl.innerHTML = `<div class="content-body">${html}</div>`;
                // 绑定歌词触发器
                bindLyricTriggers();
                // 表格横向滚动包裹；预习曲目额外做章节卡片化
                wrapTablesForScroll(contentEl);
                if (filePath.includes('songlist')) enhanceSonglist(contentEl);
                if (filePath.includes('credits')) enhanceCredits(contentEl);

                const contentDiv = document.getElementById('content');
                if (window.BackToTop && contentDiv) {
                    window.BackToTop.bind(contentDiv);
                }

                // 关键：自动为所有 img 包裹 a 标签（如果还没包）
                const contentBody = contentEl.querySelector('.content-body');
                if (contentBody) {
                    const images = contentBody.querySelectorAll('img[src]');
                    images.forEach(img => {
                        // 跳过已经包裹在 <a> 中的图片
                        if (img.parentElement.tagName === 'A') return;

                        const src = img.src;
                        // 只处理本站图片（避免外部链接出错）
                        if (!src || !src.includes('/img/')) return;

                        const a = document.createElement('a');
                        a.href = src;
                        a.setAttribute('data-lightbox', 'markdown-images'); // 可选：用于分组
                        img.parentNode.insertBefore(a, img);
                        a.appendChild(img);
                    });

                    // 初始化 Simple Lightbox（仅针对当前内容区域）
                    new SimpleLightbox('.content-body a[href$=".jpg"], .content-body a[href$=".jpeg"], .content-body a[href$=".png"], .content-body a[href$=".gif"]', {
                        captions: true,
                        captionType: 'attr',
                        captionsData: 'alt',
                        closeText: '×',
                        swipeClose: true,
                        disableScroll: true,
                        alertError: false
                    });
                }
            } else {
                contentEl.innerHTML = `<div class="error">${i18n.t("error.notFound")}</div>`;
            }
        } catch (err) {
            console.error(`Failed to load ${filePath}:`, err);
            contentEl.innerHTML = `<div class="error">${i18n.t(errorKey)}</div>`;
        }
    };

    // 巡演日志
    /*btnDiary.addEventListener('click', () =>
        loadMarkdownTab(btnDiary, 'data/diary.md', 'loading.diary')
    );*/

    // 预习曲目
    btnSonglist.addEventListener('click', () =>
        loadMarkdownTab(btnSonglist, 'data/songlist.md', 'loading.songlist')
    );

    // 致谢名单
    btnCredits.addEventListener('click', () =>
        loadMarkdownTab(btnCredits, 'data/credits.md', 'loading.credits')
    );

    // 彩蛋环节
    btnBonus.addEventListener('click', () =>
        loadMarkdownTab(btnBonus, 'data/bonus.md', 'loading.bonus')
    );

    // 关于本站
    btnAbout.addEventListener('click', () =>
        loadMarkdownTab(btnAbout, 'data/about.md', 'loading.about')
    );

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

        return {startDate, endDate};
    }

    // 检查是否为待定项目（无有效日期或包含"未官宣"）
    function isPendingEvent(event) {
        const dateInfo = parseDate(event.date);
        const hasValidDate = dateInfo !== null;
        return !hasValidDate;
    }

    // === 演出歌单（特殊逻辑）===
    btnSetlist.addEventListener('click', async () => {
        window.activeTabButton = btnSetlist;
        setActive(btnSetlist);
        showContent();
        contentEl.innerHTML = `<div class="loading">${i18n.t("loading.setlist.cities")}</div>`;

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
            contentEl.innerHTML = `<div class="error">${i18n.t("error.loadFailed")}</div>`;
        }
    });

    // 渲染歌单选择器的函数
    function renderSetlistSelector(itinerary) {
        // 过滤掉待定项目（无有效日期或包含"未官宣"）
        const validItinerary = itinerary.filter(event => !isPendingEvent(event));

        // 生成城市卡片（状态色与地图图例一致）
        const statusOf = (event) => {
            if (event.name.includes('未官宣')) return 'tbd';
            const d = parseDate(event.date);
            if (!d) return 'tbd';
            const today = getToday();
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
                <button class="chip on" data-filter="all">${i18n.t("filter.all")}</button>
                <button class="chip" data-filter="done">${i18n.t("map.legend.finished")}</button>
                <button class="chip" data-filter="doing">${i18n.t("map.legend.ongoing")}</button>
                <button class="chip" data-filter="todo">${i18n.t("map.legend.upcoming")}</button>
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

        const contentDiv = document.getElementById('content');
        if (window.BackToTop && contentDiv) {
            window.BackToTop.bind(contentDiv);
        }

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

            songListContent.innerHTML = `<div class="loading">${i18n.t("loading.setlist.songs")}</div>`;

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

                // 渲染演出信息 + 歌单
                songListContent.innerHTML = `
                    <div class="city-info">
                        <strong>${i18n.t("setlist.info.title")}:</strong><br>
                        ${i18n.t("setlist.info.venue")}: ${eventInfo.location}<br>
                        ${i18n.t("setlist.info.date")}: ${eventInfo.date}<br>
                        ${i18n.t("setlist.info.location")}: ${eventInfo.province} ${eventInfo.city}
                    </div>
                    <div class="content-body">${html}</div>
                `;
                enhanceCompareTables(songListContent);
            } catch (err) {
                console.error('Setlist load error:', err);
                if (err.code === 'FILE_NOT_PUBLISHED') {
                    songListContent.innerHTML = `
                        <div class="warning">
                            ${err.unofficial
                        ? i18n.t("setlist.unofficial")
                        : i18n.t("setlist.fileNotPublished")
                    }
                        </div>
                    `;
                } else if (err.message?.includes('fetch')) {
                    songListContent.innerHTML = `<div class="error">${i18n.t("error.network")}</div>`;
                } else {
                    songListContent.innerHTML = `<div class="error">${i18n.t("error.setlist.loadFailed")}</div>`;
                }
            }
        });
    }

    // ==================== 内容增强：表格滚动 / 章节卡片 / 差异高亮 ====================
    function wrapTablesForScroll(container) {
        container.querySelectorAll('table').forEach(table => {
            if (table.parentElement && table.parentElement.classList.contains('table-scroll')) return;
            const wrap = document.createElement('div');
            wrap.className = 'table-scroll';
            table.parentNode.insertBefore(wrap, table);
            wrap.appendChild(table);
        });
    }

    function enhanceSonglist(contentEl) {
        const body = contentEl.querySelector('.content-body');
        if (!body) return;

        const heads = Array.from(body.querySelectorAll('h4'))
            .filter(h => /^(Chapter|Encore)/i.test(h.textContent.trim()));
        const cards = [];

        heads.forEach(h => {
            const card = document.createElement('div');
            card.className = 'chapter-card';
            const band = document.createElement('div');
            band.className = 'band';
            const inner = document.createElement('div');
            inner.className = 'body';
            card.appendChild(band);
            card.appendChild(inner);

            h.parentNode.insertBefore(card, h);
            inner.appendChild(h);
            while (card.nextSibling && !(card.nextSibling.nodeType === 1 && /^H[34]$/.test(card.nextSibling.tagName))) {
                inner.appendChild(card.nextSibling);
            }
            cards.push(card);
        });

        if (cards.length) {
            const grid = document.createElement('div');
            grid.className = 'chapters';
            cards[0].parentNode.insertBefore(grid, cards[0]);
            cards.forEach(c => grid.appendChild(c));
        }

        body.querySelectorAll('table tr').forEach(tr => {
            const tds = tr.querySelectorAll('td');
            if (tds.length < 2 || tds[0].querySelector('.duet, .solo')) return;
            const singer = tds[1].textContent;
            const dot = document.createElement('span');
            if (singer.includes('&')) {
                dot.className = 'duet';
                dot.innerHTML = '<i></i><i></i>';
            } else if (singer.includes('林子祥')) {
                dot.className = 'solo lam';
                dot.innerHTML = '<i></i>';
            } else if (singer.includes('叶蒨文')) {
                dot.className = 'solo sally';
                dot.innerHTML = '<i></i>';
            } else {
                return;
            }
            tds[0].insertBefore(dot, tds[0].firstChild);
        });
    }

    function enhanceCompareTables(container) {
        container.querySelectorAll('table').forEach(table => {
            if (!table.closest('.table-scroll')) {
                const wrap = document.createElement('div');
                wrap.className = 'table-scroll';
                table.parentNode.insertBefore(wrap, table);
                wrap.appendChild(table);
            }

            const labelHeader = table.querySelector('tr.label-header');
            if (!labelHeader) return;
            const groups = labelHeader.children.length / 3;
            if (!Number.isInteger(groups) || groups < 2) return;

            const wrap = table.closest('.table-scroll') || table;
            const toggle = document.createElement('div');
            toggle.className = 'diff-toggle';
            toggle.innerHTML = `<label><input type="checkbox"> ${i18n.t('setlist.diffHighlight')}</label>`;
            wrap.parentNode.insertBefore(toggle, wrap);

            const checkbox = toggle.querySelector('input');
            checkbox.addEventListener('change', () => {
                const on = checkbox.checked;
                table.querySelectorAll('tr').forEach(tr => {
                    if (tr.classList.contains('date-header') || tr.classList.contains('label-header') || tr.classList.contains('chapter-row')) return;
                    const tds = tr.querySelectorAll('td');
                    if (tds.length < groups * 3) return;
                    const names = [];
                    for (let g = 0; g < groups; g++) {
                        names.push(tds[g * 3 + 1] ? tds[g * 3 + 1].textContent.trim() : '');
                    }
                    const diff = names.some(n => n !== names[0]);
                    tr.classList.toggle('row-diff', on && diff);
                    for (let g = 0; g < groups; g++) {
                        const cell = tds[g * 3 + 1];
                        if (cell) cell.classList.toggle('cell-diff', on && diff && names[g] !== names[0]);
                    }
                });
            });
        });
    }
    window.enhanceCompareTables = enhanceCompareTables;

    function enhanceCredits(contentEl) {
        const body = contentEl.querySelector('.content-body');
        if (!body) return;
        body.classList.add('credits-view');

        const iconOf = (text) => {
            if (text.includes('小红书')) return '📕';
            if (text.includes('微博')) return '🧣';
            if (text.includes('抖音')) return '🎵';
            if (/bilibili|B站/i.test(text)) return '📺';
            return '🔗';
        };

        // 1. 官方账号（Concert Official）：表格 → 平台链接卡
        Array.from(body.querySelectorAll('h2')).forEach(h2 => {
            if (!/Concert Official|官方账号/i.test(h2.textContent)) return;
            let el = h2.nextElementSibling;
            while (el && el.tagName !== 'TABLE' && !el.classList.contains('table-scroll')) {
                el = el.nextElementSibling;
            }
            if (!el) return;
            const wrap = el.classList.contains('table-scroll') ? el : null;
            const tbl = wrap ? wrap.querySelector('table') : el;
            if (!tbl) return;

            const grid = document.createElement('div');
            grid.className = 'link-cards';
            tbl.querySelectorAll('tbody tr').forEach(tr => {
                const tds = tr.querySelectorAll('td');
                if (tds.length < 2) return;
                const platform = tds[0].textContent.trim();
                const a = tds[1].querySelector('a');
                if (!a) return;
                const card = document.createElement('a');
                card.className = 'link-card';
                card.href = a.href;
                card.target = '_blank';
                card.rel = 'noopener noreferrer';
                card.innerHTML = `<span class="ic">${iconOf(platform)}</span><span><b>${platform}</b><small>${a.textContent.trim()}</small></span>`;
                grid.appendChild(card);
            });
            (wrap || tbl).replaceWith(grid);
        });

        // 2. kdocs 完整名单卡片：替换“在线文档传送门”段落
        const kdocs = body.querySelector('a[href*="kdocs"]');
        const kdocsUrl = kdocs ? kdocs.href : '';
        if (kdocs) {
            const card = document.createElement('a');
            card.className = 'kdocs-card';
            card.href = kdocs.href;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.innerHTML = `<span class="kdocs-ic">📄</span><span><b>${kdocs.textContent.trim()}</b><small>金山文档在线协作表格 · 持续更新中 · 点击跳转查看完整内容</small></span><span class="kdocs-arrow">打开 →</span>`;
            const portalP = Array.from(body.querySelectorAll('p')).find(p => p.textContent.includes('在线文档传送门'));
            const kdocsBq = kdocs.closest('blockquote');
            if (portalP) portalP.replaceWith(card);
            else if (kdocsBq) kdocsBq.after(card);
            else kdocs.parentNode.insertBefore(card, kdocs);
            if (kdocsBq) kdocsBq.remove();
        }

        // 3. Rolling 视频传送门：列表 → 卡片墙
        const rollingUl = Array.from(body.querySelectorAll('ul')).find(ul => ul.textContent.includes('致谢名单'));
        if (rollingUl) {
            const list = document.createElement('div');
            list.className = 'rolling-list';
            rollingUl.querySelectorAll('li').forEach(li => {
                const a = li.querySelector('a');
                const full = li.textContent.trim();
                const station = full.split('|')[0].split('：')[0].trim();
                const m = full.match(/（(.+)）/);
                let note = m ? m[1] : '';
                let item;
                if (a) {
                    item = document.createElement('a');
                    item.href = a.href;
                    item.target = '_blank';
                    item.rel = 'noopener noreferrer';
                } else if (note.includes('已更新') && kdocsUrl) {
                    item = document.createElement('a');
                    item.href = kdocsUrl;
                    item.target = '_blank';
                    item.rel = 'noopener noreferrer';
                } else {
                    item = document.createElement('span');
                    item.className = 'off';
                    if (note === '暂缺') note = '';
                }
                item.innerHTML = `<span class="rl-main"><b>${station}</b><small>${note}</small></span>`;
                list.appendChild(item);
            });
            rollingUl.replaceWith(list);
        }

        // 4. “Rolling 视频传送门”原本是加粗段落，升级为标题样式
        const rollingP = Array.from(body.querySelectorAll('p')).find(p => p.textContent.includes('Rolling'));
        if (rollingP) {
            const h = document.createElement('h2');
            h.textContent = rollingP.textContent.replace(/[：:]\s*$/, '');
            rollingP.replaceWith(h);
        }
    }

    function bindLyricTriggers() {
        const triggers = document.querySelectorAll('.lyric-trigger[data-lyric-file]');
        triggers.forEach(el => {
            el.style.cursor = 'pointer';
            el.style.color = '#1B7AC2';
            // 悬浮下划线，鼠标移开取消
            el.addEventListener('mouseover', () => {
                el.style.textDecoration = 'underline';
            })
            el.addEventListener('mouseout', () => {
                el.style.textDecoration = 'none';
            })

            el.addEventListener('click', async () => {
                const file = el.getAttribute('data-lyric-file');
                const title = el.textContent.trim();

                if (file) {
                    try {
                        const res = await fetch(`data/lyrics/${file}`, {
                            headers: { 'Cache-Control': 'no-cache' }
                        });
                        if (!res.ok) throw new Error('歌词文件加载失败');
                        const md = await res.text();
                        const html = marked.parse(md);
                        showLyricPopup(html, title);
                    } catch (err) {
                        showLyricPopup(`<div class="error">❌ 无法加载歌词：${file}</div>`, title);
                        console.error('歌词加载失败:', err);
                    }
                }
            });
        });
    }

    function showLyricPopup(htmlContent, title = '') {
        const mask = document.createElement('div');
        mask.className = 'drawer-mask';

        const drawer = document.createElement('aside');
        drawer.className = 'lyric-drawer';

        const head = document.createElement('div');
        head.className = 'drawer-head';
        const heading = document.createElement('h3');
        heading.textContent = title || '歌词';
        head.appendChild(heading);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'drawer-close';
        closeBtn.textContent = '✕';
        closeBtn.setAttribute('aria-label', 'close');
        head.appendChild(closeBtn);
        drawer.appendChild(head);

        const body = document.createElement('div');
        body.className = 'drawer-body';
        const content = document.createElement('div');
        content.className = 'lyric-content';
        content.innerHTML = htmlContent;
        body.appendChild(content);
        drawer.appendChild(body);

        const foot = document.createElement('div');
        foot.className = 'drawer-foot';
        const copyBtn = document.createElement('button');
        const copyText = i18nInstance ? i18nInstance.t('btn.copyLyric') : '复制歌词';
        const copiedText = i18nInstance ? i18nInstance.t('btn.copied') : '已复制 ✓';
        copyBtn.textContent = copyText;
        copyBtn.onclick = () => {
            if (navigator.clipboard) navigator.clipboard.writeText(content.innerText);
            copyBtn.textContent = copiedText;
            setTimeout(() => { copyBtn.textContent = copyText; }, 1500);
        };
        foot.appendChild(copyBtn);
        drawer.appendChild(foot);

        function lockScroll() {
            // 锁定背景页面滚动，并补偿滚动条消失引起的布局跳动
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = 'hidden';
            if (scrollbarWidth > 0) document.body.style.paddingRight = scrollbarWidth + 'px';
        }
        function unlockScroll() {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
        function close() {
            mask.remove();
            drawer.remove();
            document.removeEventListener('keydown', onKey);
            unlockScroll();
        }
        function onKey(e) { if (e.key === 'Escape') close(); }
        mask.addEventListener('click', close);
        closeBtn.addEventListener('click', close);
        document.addEventListener('keydown', onKey);

        lockScroll();
        document.body.appendChild(mask);
        document.body.appendChild(drawer);
    }

    // hash 路由：刷新/分享链接可直达指定展厅（须在所有监听器绑定完成后执行）
    const hashBtnId = Object.keys(TAB_HASH).find(id =>
        TAB_HASH[id] === initialHash && !['btnChina', 'btnWorld'].includes(id)
    );
    if (hashBtnId) {
        const btn = document.getElementById(hashBtnId);
        if (btn) btn.click();
        // 滚动定位由 btn.click() 内部的 showContent 触发，锚点在滚动静止后由 scroll-spy 对齐
    } else {
        window.scrollTo(0, 0);
        updateHashFromScroll();
    }

});