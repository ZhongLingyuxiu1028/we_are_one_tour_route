// js/tabs/songlist.js · 预习曲目 Tab：章节卡片 + 点击查看曲目表（数据拆分至 data/songlist/）
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
    { file: 'data/songlist/unofficial.md', variant: 'sl-appendix' }
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

        // 章节元信息 + 正文（H2 与设计思路行剔除，详情区改用自定义头渲染）
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
            const count = new DOMParser().parseFromString(html, 'text/html')
                .querySelectorAll('table tbody tr').length;
            return { no, title: name || no, idea: ideaMatch ? ideaMatch[1].trim() : '', count, html };
        }));

        // 平铺展示：各章节表格全部直接渲染（章节卡片模式暂不启用）
        contentEl.innerHTML = `
            <div class="content-body songlist-view">${introHtml}</div>
            <div class="chapters">
                ${entries.map((e, i) => `
                    <div class="chapter-card${SONGLIST_CHAPTERS[i].variant ? ' ' + SONGLIST_CHAPTERS[i].variant : ''}">
                        <div class="band"></div>
                        <div class="body">
                            <div class="ch-head">
                                <h4>${e.title === e.no ? e.no : e.no + ' · ' + e.title}</h4>
                                <span class="ch-count">${e.count} ${window.i18n.t('songlist.songUnit')}</span>
                            </div>
                            ${e.idea ? `<p class="ch-idea">设计思路：${e.idea}</p>` : ''}
                            <div class="content-body songlist-view">${e.html}</div>
                        </div>
                    </div>`).join('')}
            </div>
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
