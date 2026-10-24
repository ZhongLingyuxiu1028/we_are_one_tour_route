// js/tabs/content-utils.js · 内容增强公共工具：表格包裹、灯箱、歌词抽屉、复制按钮、演唱人色点

// 表格横向滚动包裹
export function wrapTablesForScroll(container) {
    container.querySelectorAll('table').forEach(table => {
        if (table.parentElement && table.parentElement.classList.contains('table-scroll')) return;
        const wrap = document.createElement('div');
        wrap.className = 'table-scroll';
        table.parentNode.insertBefore(wrap, table);
        wrap.appendChild(table);
    });
}

// 图片增强：为本站 img 自动包裹 a 标签并初始化 Simple Lightbox（作用于容器内最近的 .content-body）
export function enhanceContentImages(scope) {
    const contentBody = scope.querySelector('.content-body');
    if (!contentBody) return;

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

// 歌词触发器绑定：点击后拉取 Markdown 并以抽屉展示
export function bindLyricTriggers() {
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

// 歌词抽屉（右侧滑出，Esc/遮罩/按钮关闭，锁定背景滚动）
export function showLyricPopup(htmlContent, title = '') {
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
    const copyText = window.i18n ? window.i18n.t('btn.copyLyric') : '复制歌词';
    const copiedText = window.i18n ? window.i18n.t('btn.copied') : '已复制 ✓';
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

// 复制歌单名按钮：写入剪贴板并给出「已复制」反馈
export function bindCopyButtons(scope) {
    scope.querySelectorAll('.copy-btn[data-copy]').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.getAttribute('data-copy');
            if (text && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
            const original = btn.innerHTML;
            btn.classList.add('copied');
            btn.innerHTML = window.i18n ? window.i18n.t('btn.copied') : '已复制 ✓';
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = original;
            }, 1500);
        });
    });
}

// 演唱人色点：曲目单元格前插入 合唱/林/叶 标记
export function addSingerDots(scope) {
    scope.querySelectorAll('table tr').forEach(tr => {
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

// 内容区渲染完成后绑定「返回顶部」到内容区滚动容器
export function bindBackToTop() {
    const contentDiv = document.getElementById('content');
    if (window.BackToTop && contentDiv) {
        window.BackToTop.bind(contentDiv);
    }
}
