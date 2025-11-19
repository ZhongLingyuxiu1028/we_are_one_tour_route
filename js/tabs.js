// js/tabs.js

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
    const btnSonglist = document.getElementById('btnSonglist');
    const btnSetlist = document.getElementById('btnSetlist');
    const btnStaffs = document.getElementById('btnStaffs');
    const btnBonus = document.getElementById('btnBonus');
    const btnAbout = document.getElementById('btnAbout');

    // 所有控制按钮
    const allButtons = [btnChina, btnWorld, btnSonglist, btnSetlist, btnStaffs, btnBonus, btnAbout];

    function setActive(button) {
        allButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }

    function showMap() {
        mapEl.style.display = 'block';
        contentEl.style.display = 'none';
    }

    function showContent() {
        mapEl.style.display = 'none';
        contentEl.style.display = 'block';
    }

    // 默认显示地图（中国地图）
    setActive(btnChina);
    showMap();

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
            } else {
                contentEl.innerHTML = `<div class="error">${i18n.t("error.notFound")}</div>`;
            }
        } catch (err) {
            console.error(`Failed to load ${filePath}:`, err);
            contentEl.innerHTML = `<div class="error">${i18n.t(errorKey)}</div>`;
        }
    };

    // 预习曲目
    btnSonglist.addEventListener('click', () =>
        loadMarkdownTab(btnSonglist, 'data/songlist.md', 'loading.songlist')
    );

    // 致谢名单
    btnStaffs.addEventListener('click', () =>
        loadMarkdownTab(btnStaffs, 'data/staffs.md', 'loading.staffs')
    );

    // 彩蛋环节
    btnBonus.addEventListener('click', () =>
        loadMarkdownTab(btnBonus, 'data/bonus.md', 'loading.bonus')
    );

    // 关于本站
    btnAbout.addEventListener('click', () =>
        loadMarkdownTab(btnAbout, 'data/about.md', 'loading.about')
    );

    // === 演出歌单（特殊逻辑）===
    btnSetlist.addEventListener('click', async () => {
        window.activeTabButton = btnSetlist;
        setActive(btnSetlist);
        showContent();
        contentEl.innerHTML = `<div class="loading">${i18n.t("loading.setlist.cities")}</div>`;

        try {
            let itinerary = window.itineraryData;
            if (!itinerary) {
                const res = await fetch('data/itinerary.json');
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
        // 生成城市选择器HTML
        let cityOptions = '';
        itinerary.forEach((event, index) => {
            // 修正：使用 event['setlist-name'] 访问JSON中的字段，并进行文件名标准化
            let setlistName = event['setlist-name'] || `_0${index + 1}_${event.city.replace('（未官宣）', '').replace(' ', '')}`;

            // 标准化文件名：转为小写，替换特殊字符
            setlistName = setlistName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            cityOptions += `<option value="${setlistName}" data-index="${index}">${event.name} (${event.date})</option>`;
        });

        contentEl.innerHTML = `
            <div class="city-selector">
                <label for="citySelect">${i18n.t("select.city")}</label>
                <select id="citySelect">
                    <option value="">${i18n.t("setlist.selectCityPrompt")}</option>
                    ${cityOptions}
                </select>
            </div>
            <div id="songListContent" style="margin-top: 16px;"></div>
        `;

        const songListContent = document.getElementById('songListContent');
        songListContent.innerHTML = `<div class="loading">${i18n.t("setlist.selectCityPrompt")}</div>`;

        document.getElementById('citySelect').addEventListener('change', async (e) => {
            const selectedValue = e.target.value;
            const selectedIndex = e.target.options[e.target.selectedIndex]?.dataset.index;

            if (!selectedValue) {
                songListContent.innerHTML = `<div class="loading">${i18n.t("setlist.selectCityPrompt")}</div>`;
                return;
            }

            songListContent.innerHTML = `<div class="loading">${i18n.t("loading.setlist.songs")}</div>`;

            try {
                const htmlPath = `./data/setlist/${selectedValue}.html`;
                const mdPath = `./data/setlist/${selectedValue}.md`;

                let html = '';
                let eventInfo = itinerary[parseInt(selectedIndex)];

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

});