// js/tabs/credits.js · 致谢名单卡片视图增强（官方账号链接卡 / kdocs 传送门 / Rolling 视频墙）

export function enhanceCredits(contentEl) {
    const body = contentEl.querySelector('.content-body');
    if (!body) return;
    body.classList.add('credits-view');

    const iconOf = (text) => {
        if (text.includes('小红书')) return '📕';
        if (text.includes('微博')) return '🧣';
        if (text.includes('抖音')) return '🎵';
        if (/bilibili|B站/i.test(text)) return '📺';
        return '🔗';
    };

    // 1. 官方账号（Concert Official）：表格 → 平台链接卡
    Array.from(body.querySelectorAll('h2')).forEach(h2 => {
        if (!/Concert Official|官方账号/i.test(h2.textContent)) return;
        let el = h2.nextElementSibling;
        while (el && el.tagName !== 'TABLE' && !el.classList.contains('table-scroll')) {
            el = el.nextElementSibling;
        }
        if (!el) return;
        const wrap = el.classList.contains('table-scroll') ? el : null;
        const tbl = wrap ? wrap.querySelector('table') : el;
        if (!tbl) return;

        const grid = document.createElement('div');
        grid.className = 'link-cards';
        tbl.querySelectorAll('tbody tr').forEach(tr => {
            const tds = tr.querySelectorAll('td');
            if (tds.length < 2) return;
            const platform = tds[0].textContent.trim();
            const a = tds[1].querySelector('a');
            if (!a) return;
            const card = document.createElement('a');
            card.className = 'link-card';
            card.href = a.href;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.innerHTML = `<span class="ic">${iconOf(platform)}</span><span><b>${platform}</b><small>${a.textContent.trim()}</small></span>`;
            grid.appendChild(card);
        });
        (wrap || tbl).replaceWith(grid);
    });

    // 2. kdocs 完整名单卡片：替换“在线文档传送门”段落
    const kdocs = body.querySelector('a[href*="kdocs"]');
    const kdocsUrl = kdocs ? kdocs.href : '';
    if (kdocs) {
        const card = document.createElement('a');
        card.className = 'kdocs-card';
        card.href = kdocs.href;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.innerHTML = `<span class="kdocs-ic">📄</span><span><b>${kdocs.textContent.trim()}</b><small>持续更新中 · 点击跳转查看完整内容</small></span><span class="kdocs-arrow">打开 →</span>`;
        const portalP = Array.from(body.querySelectorAll('p')).find(p => p.textContent.includes('在线文档传送门'));
        const kdocsBq = kdocs.closest('blockquote');
        if (portalP) portalP.replaceWith(card);
        else if (kdocsBq) kdocsBq.after(card);
        else kdocs.parentNode.insertBefore(card, kdocs);
        if (kdocsBq) kdocsBq.remove();
    }

    // 3. Rolling 视频传送门：列表 → 卡片墙
    const rollingUl = Array.from(body.querySelectorAll('ul')).find(ul => ul.textContent.includes('致谢名单'));
    if (rollingUl) {
        const list = document.createElement('div');
        list.className = 'rolling-list';
        rollingUl.querySelectorAll('li').forEach(li => {
            const a = li.querySelector('a');
            const full = li.textContent.trim();
            const station = full.split('|')[0].split('：')[0].trim();
            const m = full.match(/（(.+)）/);
            let note = m ? m[1] : '';
            let item;
            if (a) {
                item = document.createElement('a');
                item.href = a.href;
                item.target = '_blank';
                item.rel = 'noopener noreferrer';
            } else if (note.includes('已更新') && kdocsUrl) {
                item = document.createElement('a');
                item.href = kdocsUrl;
                item.target = '_blank';
                item.rel = 'noopener noreferrer';
            } else {
                item = document.createElement('span');
                item.className = 'off';
                if (note === '暂缺') note = '';
            }
            item.innerHTML = `<span class="rl-main"><b>${station}</b><small>${note}</small></span>`;
            list.appendChild(item);
        });
        rollingUl.replaceWith(list);
    }

    // 4. “Rolling 视频传送门”原本是加粗段落，升级为标题样式
    const rollingP = Array.from(body.querySelectorAll('p')).find(p => p.textContent.includes('Rolling'));
    if (rollingP) {
        const h = document.createElement('h2');
        h.textContent = rollingP.textContent.replace(/[：:]\s*$/, '');
        rollingP.replaceWith(h);
    }

    // 5. Site Credits 表格：统一为彩蛋「参考目录」表样式（见 setlistStyle.css .reference-table）
    Array.from(body.querySelectorAll('h2')).forEach(h2 => {
        if (!/Site Credits/i.test(h2.textContent)) return;
        let el = h2.nextElementSibling;
        while (el && el.tagName !== 'TABLE' && !el.classList.contains('table-scroll')) {
            el = el.nextElementSibling;
        }
        if (!el) return;
        const tbl = el.classList.contains('table-scroll') ? el.querySelector('table') : el;
        if (tbl) tbl.classList.add('reference-table', 'credits-table');
    });
}
