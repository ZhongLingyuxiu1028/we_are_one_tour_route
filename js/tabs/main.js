// js/tabs/main.js · 内容展厅模块入口（ES modules，由 index.html 以 type="module" 加载）
//
// 模块结构：
//   core.js          Tab 状态 / 视图切换 / 导航高亮
//   scrollspy.js     滚动监听（URL 锚点 + 导航跟随）
//   nav.js           顶栏交互（导航链接 / 下拉菜单 / 品牌回顶）
//   content-utils.js 内容增强公共工具（表格 / 灯箱 / 歌词抽屉 / 复制 / 色点）
//   markdown.js      Markdown 型 Tab（致谢名单等）
//   songlist.js      预习曲目 Tab
//   setlist.js       演出歌单 Tab（含多日对比差异高亮）
//   bonus.js         彩蛋环节 Tab
//   about.js         关于本站时间线（独立板块）
//   credits.js       致谢名单卡片视图增强
//
// 对经典脚本的兼容出口（app.js / i18n.js / back-to-top.js 仍为经典脚本，经 window 交互）：
//   window.reloadActiveTab       语言切换后重载当前 Tab（i18n.js / app.js 调用）
//   window.enhanceCompareTables  歌单表格增强（app.js 地图点击歌单流程调用）
//   window.ScrollSpy             滚动监听控制（scrollspy.js 内赋值）

import {
    TAB_HASH, setActive, setActiveTabButton, getActiveTabButton,
    skipContentScrollOnce, showMap, getContentEl, suspendSpy, syncNavActive
} from './core.js';
import { initScrollSpy, updateHashFromScroll } from './scrollspy.js';
import { initNavWiring } from './nav.js';
import { loadMarkdownTab } from './markdown.js';
import { loadSetlistTab, enhanceCompareTables } from './setlist.js';
import { loadSonglistTab } from './songlist.js';
import { loadBonusTab } from './bonus.js';
import { initAboutSection } from './about.js';

// ---- 滚动恢复（原 tabs.js 顶层逻辑；模块于 DOM 解析后、load 事件前执行，时序一致）----
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

// ---- 对经典脚本的兼容出口 ----

// 重新加载当前激活的 tab（用于语言切换后刷新内容）
window.reloadActiveTab = function () {
    if (getActiveTabButton()) {
        // 语言切换后由 setLang 统一控制滚动位置，重载内容时不滚到展厅
        skipContentScrollOnce();
        // 使用 setTimeout 确保 DOM 和 i18n 状态稳定后再触发
        setTimeout(() => {
            getActiveTabButton().click();
        }, 50);
    }
};

// 歌单表格增强（app.js 的地图点击歌单流程调用）
window.enhanceCompareTables = enhanceCompareTables;

// ---- 初始化（i18n 就绪后执行）----
function initTabs() {
    const contentEl = getContentEl();

    // 按钮元素
    const btnChina = document.getElementById('btnChina');
    const btnWorld = document.getElementById('btnWorld');
    const btnSonglist = document.getElementById('btnSonglist');
    const btnSetlist = document.getElementById('btnSetlist');
    const btnCredits = document.getElementById('btnCredits');
    const btnBonus = document.getElementById('btnBonus');

    // 先记录 URL hash，再执行默认激活（setActive 会改写 hash）
    const initialHash = location.hash.replace('#', '');

    // 默认显示地图（中国地图）
    setActive(btnChina);
    showMap();

    // 顶栏导航 / 下拉菜单 / 品牌回顶
    initNavWiring();

    // 滚动监听（URL 锚点 + 导航高亮跟随）
    initScrollSpy();

    // === 地图按钮（不参与内容重载）===
    btnChina.addEventListener('click', () => {
        setActive(btnChina);
        showMap();
        if (window.switchMap) window.switchMap('china');
        setActiveTabButton(null); // 清除激活 tab
    });

    btnWorld.addEventListener('click', () => {
        setActive(btnWorld);
        showMap();
        if (window.switchMap) window.switchMap('world');
        setActiveTabButton(null);
    });

    // === 内容型 Tab ===
    // 预习曲目：章节卡片 + 详情（数据拆分至 data/songlist/）
    btnSonglist.addEventListener('click', () => loadSonglistTab(btnSonglist));

    // 演出歌单（特殊逻辑，见 setlist.js）
    btnSetlist.addEventListener('click', () => loadSetlistTab(btnSetlist));

    // 致谢名单
    btnCredits.addEventListener('click', () =>
        loadMarkdownTab(btnCredits, 'data/credits.md', 'loading.credits')
    );

    // 彩蛋环节
    btnBonus.addEventListener('click', () => loadBonusTab(btnBonus));

    // 关于本站：独立板块时间线
    initAboutSection();

    // hash 路由：刷新/分享链接可直达指定展厅（须在所有监听器绑定完成后执行）
    const hashBtnId = Object.keys(TAB_HASH).find(id =>
        TAB_HASH[id] === initialHash && !['btnChina', 'btnWorld'].includes(id)
    );
    if (hashBtnId) {
        const btn = document.getElementById(hashBtnId);
        if (btn) btn.click();
        // 滚动定位由 btn.click() 内部的 showContent 触发，锚点在滚动静止后由 scroll-spy 对齐
    } else if (initialHash === 'about') {
        const aboutEl = document.getElementById('about');
        if (aboutEl) {
            suspendSpy();
            aboutEl.scrollIntoView();
            syncNavActive('.nav a[data-scroll="#about"]');
        }
    } else {
        window.scrollTo(0, 0);
        updateHashFromScroll();
    }
}

// i18n.js 在派发 i18nReady 前会置位 window.__i18nReady。
// ES module 为延迟执行，事件可能先于本模块执行触发，故需双路径兜底：
// 标记已置位则直接初始化，否则挂事件监听。
if (window.__i18nReady) {
    initTabs();
} else {
    document.addEventListener('i18nReady', initTabs, { once: true });
}
