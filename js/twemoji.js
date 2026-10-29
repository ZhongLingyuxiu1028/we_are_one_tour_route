// js/twemoji.js
// 将页面上的 emoji 字符统一渲染为自托管 Twemoji SVG（lib/twemoji/svg/），
// 消除不同系统 emoji 字体（Segoe / Apple / Noto）造成的显示差异。
// 资源子集由 tools/fetch-twemoji.mjs 生成；新增含 emoji 的内容后重跑该脚本补图。

(function () {
    'use strict';

    var OPTIONS = {
        base: 'lib/twemoji/',
        folder: 'svg',
        ext: '.svg',
        className: 'twe'
    };

    function parse(root) {
        if (window.twemoji && root) {
            try { twemoji.parse(root, OPTIONS); } catch (e) { /* 静默降级为原生 emoji */ }
        }
    }

    // 供动态渲染后手动补渲染：window.renderTwemoji(el)
    window.renderTwemoji = parse;

    function init() {
        parse(document.body);

        // 监听后续 DOM 变化：tab 异步加载内容、i18n 切换、ECharts tooltip、
        // 爱心特效等动态插入的 emoji 一并渲染
        var observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === 'characterData' && m.target.parentNode) {
                    parse(m.target.parentNode);
                } else if (m.type === 'childList' && m.addedNodes.length) {
                    for (var j = 0; j < m.addedNodes.length; j++) {
                        var n = m.addedNodes[j];
                        if (n.nodeType !== 1) { if (n.parentNode) parse(n.parentNode); continue; }
                        // 跳过 twemoji 自身插入的图片，避免无谓重入
                        if (n.tagName === 'IMG' && n.className === 'twe') continue;
                        if (n.isConnected) parse(n);
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
