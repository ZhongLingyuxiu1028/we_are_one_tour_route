// js/tabs/songlist.js · 预习曲目 Tab：导览 + 章节平铺（章节标识内嵌表格首行，数据拆分至 data/songlist/）
// 章节文件约定：H2 = 「编号 · 标题」，首条 blockquote「> 设计思路：…」，表格行数自动统计为曲数

import { setActive, setActiveTabButton, showContent, getContentEl } from './core.js';
import {
    bindCopyButtons, addSingerDots, bindLyricTriggers,
    wrapTablesForScroll, enhanceContentImages, bindBackToTop
} from './content-utils.js';

// 章节文件清单（顺序即展示顺序）
const SONGLIST_CHAPTERS = [
    { file: 'data/songlist/chapter1.md' },
    { file: 'data/songlist/chapter2.md' },
    { file: 'data/songlist/chapter3.md' },
    { file: 'data/songlist/chapter4a.md' },
    { file: 'data/songlist/chapter4b.md' },
    { file: 'data/songlist/chapter5.md' },
    { file: 'data/songlist/chapter6.md' },
    { file: 'data/songlist/encore.md' },
    { file: 'data/songlist/unofficial.md' }
];

export async function loadSonglistTab(button) {
    const contentEl = getContentEl();
    setActiveTabButton(button);
    setActive(button);
    showContent();
    contentEl.innerHTML = `<div class="loading">${window.i18n.t('loading.songlist')}</div>`;

    try {
        const responses = await Promise.all([
            fetch('data/songlist/intro.md'),
            ...SONGLIST_CHAPTERS.map(c => fetch(c.file))
        ]);
        if (!responses.every(r => r.ok)) throw new Error('songlist files not found');

        // 导览区：关于曲目选择 + 歌单入口 + 曲目一览说明
        const introHtml = marked.parse(await responses[0].text());

        // 章节元信息 + 正文（H2 与设计思路行剔除，章节标识并入表格首行）
        const entries = await Promise.all(responses.slice(1).map(async (res, i) => {
            const text = await res.text();
            const titleMatch = text.match(/^##\s+(.+)$/m);
            const rawTitle = titleMatch ? titleMatch[1].trim() : SONGLIST_CHAPTERS[i].file;
            const sepIdx = rawTitle.indexOf('·');
            const no = sepIdx > -1 ? rawTitle.slice(0, sepIdx).trim() : rawTitle;
            const name = sepIdx > -1 ? rawTitle.slice(sepIdx + 1).trim() : '';
            const ideaMatch = text.match(/^>\s*设计思路[：:]\s*(.+)$/m);
            const html = marked.parse(text)
                .replace(/<h2[^>]*>[\s\S]*?<\/h2>\s*/, '')
                .replace(/^<blockquote>[\s\S]*?<\/blockquote>\s*/, '');

            // 章节行 + 列头行并入 tbody（结构对齐舞台变化点表：sl-chapter-row / sl-head-row），
            // 曲数统计取并入前的数据行数
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const table = doc.querySelector('table');
            const tbody = table ? table.querySelector('tbody') : null;
            const count = tbody ? tbody.querySelectorAll('tr').length : 0;
            if (tbody) {
                const cols = table.querySelectorAll('thead th').length || 6;
                const label = name ? `${no} · ${name}` : no;
                const chapterRow = doc.createElement('tr');
                chapterRow.className = 'sl-chapter-row';
                chapterRow.innerHTML =
                    `<td colspan="${cols}"><span class="sl-chapter-name">${label}</span>` +
                    `<span class="sl-chapter-count">${count} ${window.i18n.t('songlist.songUnit')}</span></td>`;
                tbody.insertBefore(chapterRow, tbody.firstChild);
                const headRow = table.querySelector('thead tr');
                if (headRow) {
                    headRow.classList.add('sl-head-row');
                    chapterRow.after(headRow);
                }
            }
            return { idea: ideaMatch ? ideaMatch[1].trim() : '', count, html: doc.body.innerHTML };
        }));

        // 平铺展示：章节不做外层卡片包裹，章节标识为表格首行绿色章节行（同舞台变化点表），
        // 设计思路为表格上方纯文本段落
        contentEl.innerHTML = `
            <div class="content-body songlist-view">${introHtml}</div>
            ${entries.map(e => `
                ${e.idea ? `<p class="ch-idea">设计思路：${e.idea}</p>` : ''}
                <div class="content-body songlist-view">${e.html}</div>
            `).join('')}
        `;

        bindCopyButtons(contentEl);
        addSingerDots(contentEl);
        bindLyricTriggers();
        wrapTablesForScroll(contentEl);
        enhanceContentImages(contentEl);
        bindBackToTop();
    } catch (err) {
        console.error('Failed to load songlist:', err);
        contentEl.innerHTML = `<div class="error">${window.i18n.t('error.loadFailed')}</div>`;
    }
}
