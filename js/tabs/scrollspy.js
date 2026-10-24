// js/tabs/scrollspy.js · 滚动监听：URL 锚点 / 导航高亮跟随滚动位置
// 规则：
//  - 命中板块 = 触发线（视口上部 35%）以上最后一个板块
//  - 位于地图板块 → #map；位于内容展厅且 Tab 打开 → 对应 Tab 锚点；其余 → 各自板块锚点
//  - 编程式平滑滚动期间挂起，滚动静止后恢复；用户滚轮/触摸/按键介入时立即恢复

import { TAB_HASH, getContentEl, syncNavActive, registerSpySuspend } from './core.js';

let spySections = [];
let spySuspended = false;
let spySettleTimer = null;
let spyRafPending = false;

function isContentVisible() {
    const contentEl = getContentEl();
    return !!contentEl && contentEl.style.display !== 'none';
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

// 初始化：绑定板块配置与滚动监听（供 main.js 在 i18n 就绪后调用）
export function initScrollSpy() {
    spySections = [
        { id: 'top', hash: 'top' },
        { id: 'stats', hash: 'stats', nav: '.nav a[data-scroll="#stats"]' },
        { id: 'map-section', hash: 'map', nav: '.nav a[data-scroll="#map-section"]' },
        { id: 'hall', hash: 'hall' },
        { id: 'about', hash: 'about', nav: '.nav a[data-scroll="#about"]' }
    ].map(s => Object.assign(s, { el: document.getElementById(s.id) }));

    // 注册到 core，供视图切换/导航点击时挂起 spy
    registerSpySuspend(suspendSpy);

    window.addEventListener('scroll', onSpyScroll, { passive: true });
    window.addEventListener('resize', () => {
        if (!spySuspended) updateHashFromScroll();
    }, { passive: true });
    ['wheel', 'touchstart', 'keydown'].forEach(ev =>
        window.addEventListener(ev, () => { spySuspended = false; }, { passive: true })
    );

    // 对经典脚本暴露（i18n.js / app.js / back-to-top.js 消费）
    window.ScrollSpy = { suspend: suspendSpy, update: updateHashFromScroll };
}

export { updateHashFromScroll };
