// js/tabs/bonus.js · 彩蛋环节 Tab：标题卡片 + 点击查看详情

import { setActive, setActiveTabButton, showContent, getContentEl } from './core.js';
import { wrapTablesForScroll, enhanceContentImages, bindBackToTop } from './content-utils.js';

const BONUS_FILES = [
    'data/bonus/bonus1.md',
    'data/bonus/bonus2.md',
    'data/bonus/bonus3.md'
];

export async function loadBonusTab(button) {
    const contentEl = getContentEl();
    setActiveTabButton(button);
    setActive(button);
    showContent();
    contentEl.innerHTML = `<div class="loading">${window.i18n.t('loading.bonus')}</div>`;

    try {
        // 从每个文件的 H2 标题提取编号与名称（如 "## Bonus 1：Opening 照片出处 💑"）
        const entries = await Promise.all(BONUS_FILES.map(async (file) => {
            const res = await fetch(file);
            if (!res.ok) throw new Error(file);
            const text = await res.text();
            const m = text.match(/^##\s+Bonus\s*(\d+)[：:]\s*(.+)$/m);
            return {
                no: m ? m[1] : '',
                title: m ? m[2].replace(/\*\*/g, '').trim() : file,
                html: marked.parse(text)
            };
        }));

        contentEl.innerHTML = `
            <div class="bonus-cards">
                ${entries.map((e, i) => `
                    <button class="bonus-card" type="button" data-index="${i}">
                        <span class="bonus-no">Bonus ${e.no}</span>
                        <span class="bonus-title">${e.title}</span>
                    </button>`).join('')}
            </div>
            <div id="bonusContent"></div>
        `;

        const detailEl = document.getElementById('bonusContent');
        const renderHint = () => {
            detailEl.innerHTML = `<div class="bonus-hint">${window.i18n.t('bonus.selectPrompt')}</div>`;
        };
        renderHint();

        contentEl.querySelector('.bonus-cards').addEventListener('click', (e) => {
            const card = e.target.closest('.bonus-card');
            if (!card) return;
            // 再次点击已选中卡片 → 收起回到提示
            if (card.classList.contains('picked')) {
                card.classList.remove('picked');
                renderHint();
                return;
            }
            contentEl.querySelectorAll('.bonus-card').forEach(c => c.classList.remove('picked'));
            card.classList.add('picked');
            detailEl.innerHTML = `<div class="content-body">${entries[card.dataset.index].html}</div>`;
            // 表格样式统一为歌单「参考目录」表风格（见 setlistStyle.css .reference-table）
            detailEl.querySelectorAll('table').forEach(t => t.classList.add('reference-table'));
            // 表格横向滚动包裹 + 图片灯箱
            wrapTablesForScroll(detailEl);
            enhanceContentImages(detailEl);
        });

        bindBackToTop();
    } catch (err) {
        console.error('Failed to load bonus:', err);
        contentEl.innerHTML = `<div class="error">${window.i18n.t('error.loadFailed')}</div>`;
    }
}
