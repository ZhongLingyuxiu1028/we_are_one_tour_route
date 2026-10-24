// js/tabs/about.js · 关于本站：独立板块时间线（最新一条默认展开，其余折叠，点击展开/收起）
// 文件名含日期，如 about20261020.md；数组顺序即展示顺序（最新在前）

const ABOUT_FILES = [
    'data/about/about20261020.md',
    'data/about/about20260118.md',
    'data/about/about20251101.md'
];

export async function initAboutSection() {
    const box = document.getElementById('about-content');
    if (!box) return;

    try {
        const items = await Promise.all(ABOUT_FILES.map(async (file, i) => {
            const res = await fetch(file);
            if (!res.ok) throw new Error(file);
            const text = await res.text();
            let html = marked.parse(text);
            // 提取第一个 H2 作为时间线标题，正文内不再重复渲染
            const titleMatch = text.match(/^##\s+(.+)$/m);
            const title = titleMatch ? titleMatch[1].trim() : '';
            if (titleMatch) html = html.replace(/<h2[^>]*>[\s\S]*?<\/h2>\s*/, '');
            const m = file.match(/(\d{4})(\d{2})(\d{2})/);
            const date = m ? `${m[1]}.${m[2]}.${m[3]}` : '';
            const expanded = i === 0;
            return `<article class="timeline-item${i === 0 ? ' latest' : ' collapsed'}">
                <div class="timeline-node"></div>
                <button class="timeline-head" type="button" aria-expanded="${expanded}">
                    <time class="timeline-date">${date}</time>
                    <span class="timeline-title">${title}</span>
                    ${i === 0 ? `<span class="timeline-badge" data-i18n="about.latest">${window.i18n.t('about.latest')}</span>` : ''}
                    <svg class="timeline-chev" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <div class="timeline-card">${html}</div>
            </article>`;
        }));
        box.innerHTML = `<div class="timeline">${items.join('')}</div>`;

        // 点击头部切换展开/折叠（最新一条不参与折叠）
        box.addEventListener('click', (e) => {
            const head = e.target.closest('.timeline-head');
            if (!head) return;
            const item = head.closest('.timeline-item');
            if (item.classList.contains('latest')) return;
            const collapsed = item.classList.toggle('collapsed');
            head.setAttribute('aria-expanded', String(!collapsed));
        });
    } catch (err) {
        console.error('Failed to load about timeline:', err);
        box.innerHTML = `<div class="error">${window.i18n.t('error.loadFailed')}</div>`;
    }
}
