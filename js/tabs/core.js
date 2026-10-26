// js/tabs/core.js · Tab 核心状态与视图切换（内容展厅）

// Tab 按钮 id → URL hash 映射
export const TAB_HASH = {
    btnChina: 'map',
    btnWorld: 'map',
    btnSonglist: 'songlist',
    btnSetlist: 'setlist',
    btnCredits: 'credits',
    btnBonus: 'bonus',
    btnReport: 'report'
};

// Tab 按钮集合（元素为 index.html 静态节点）
export function getTabButtons() {
    return [
        document.getElementById('btnChina'),
        document.getElementById('btnWorld'),
        document.getElementById('btnSonglist'),
        document.getElementById('btnSetlist'),
        document.getElementById('btnCredits'),
        document.getElementById('btnBonus'),
        document.getElementById('btnReport')
    ];
}

// 当前激活的内容型 tab 按钮（语言切换重载内容时使用）
let activeTabButton = null;
export const getActiveTabButton = () => activeTabButton;
export const setActiveTabButton = (btn) => { activeTabButton = btn; };

// 语言切换重载内容时跳过滚动定位（由 reloadActiveTab 置位，showContent 消费）
let skipContentScroll = false;
export const skipContentScrollOnce = () => { skipContentScroll = true; };

// scroll-spy 挂起钩子：由 scrollspy.js 注册，避免 core ↔ scrollspy 循环依赖
let spySuspendHook = () => {};
export const registerSpySuspend = (fn) => { spySuspendHook = fn; };
export const suspendSpy = () => spySuspendHook();

// 内容区容器（index.html 静态节点）
export const getContentEl = () => document.getElementById('content');

// 导航高亮：同步顶栏链接与「内容展厅」下拉父级状态
export function setNavActive(el) {
    document.querySelectorAll('.nav a, .nav-drop-toggle').forEach(n => n.classList.remove('active'));
    if (el) {
        el.classList.add('active');
        const dd = el.closest('.nav-dropdown');
        if (dd) {
            const t = dd.querySelector('.nav-drop-toggle');
            if (t) t.classList.add('active');
        }
    }
}

export function syncNavActive(selector) {
    setNavActive(selector ? document.querySelector(selector) : null);
}

// Tab 激活：高亮按钮 + 同步导航 + 写 URL hash
export function setActive(button) {
    getTabButtons().forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    const navLink = document.querySelector(`.nav a[data-goto-tab="${button.id}"]`)
        || (TAB_HASH[button.id] === 'map' ? document.querySelector('.nav a[data-scroll="#map-section"]') : null);
    setNavActive(navLink);

    const hashName = TAB_HASH[button.id];
    if (hashName) history.replaceState(null, '', '#' + hashName);
}

// 地图视图：隐藏内容区
export function showMap() {
    const contentEl = getContentEl();
    contentEl.style.display = 'none';
    contentEl.classList.remove('show');

    const btn = document.getElementById('backToTopBtn');
    if (btn) btn.classList.remove('show');
}

// 内容视图：显示内容区并滚动到展厅
export function showContent() {
    const contentEl = getContentEl();
    contentEl.style.display = 'block';
    contentEl.classList.remove('show');
    void contentEl.offsetWidth; // 重置动画
    contentEl.classList.add('show');

    const hall = document.getElementById('hall');
    if (hall) {
        // 语言切换重载：跳过滚动，保持当前视图位置
        if (skipContentScroll) {
            skipContentScroll = false;
            return;
        }
        suspendSpy();
        hall.scrollIntoView({ behavior: 'smooth' });
    }
}
