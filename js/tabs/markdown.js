// js/tabs/markdown.js · Markdown 型 Tab 加载（巡演日志/致谢名单等多文件拼接渲染）

import { setActive, setActiveTabButton, showContent, getContentEl } from './core.js';
import { bindLyricTriggers, wrapTablesForScroll, enhanceContentImages, bindBackToTop } from './content-utils.js';
import { enhanceCredits } from './credits.js';

// 内容型 Tab：统一处理逻辑（filePaths 支持单文件路径或多文件数组，多文件按顺序拼接渲染）
export async function loadMarkdownTab(button, filePaths, loadingKey, errorKey = "error.loadFailed") {
    const files = Array.isArray(filePaths) ? filePaths : [filePaths];
    const contentEl = getContentEl();
    setActiveTabButton(button);
    setActive(button);
    showContent();
    contentEl.innerHTML = `<div class="loading">${window.i18n.t(loadingKey)}</div>`;

    try {
        const responses = await Promise.all(files.map(f => fetch(f)));
        if (responses.every(r => r.ok)) {
            const text = (await Promise.all(responses.map(r => r.text()))).join('\n\n');
            const html = marked.parse(text);
            contentEl.innerHTML = `<div class="content-body">${html}</div>`;
            // 绑定歌词触发器
            bindLyricTriggers();
            // 表格横向滚动包裹
            wrapTablesForScroll(contentEl);
            if (files.some(f => f.includes('credits'))) enhanceCredits(contentEl);

            enhanceContentImages(contentEl);
            bindBackToTop();
        } else {
            contentEl.innerHTML = `<div class="error">${window.i18n.t("error.notFound")}</div>`;
        }
    } catch (err) {
        console.error(`Failed to load ${files.join(', ')}:`, err);
        contentEl.innerHTML = `<div class="error">${window.i18n.t(errorKey)}</div>`;
    }
}
