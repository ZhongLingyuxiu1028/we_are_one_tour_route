// js/tabs/nav.js · 顶栏交互：导航链接、下拉菜单、左上角标题回顶

import { suspendSpy, syncNavActive } from './core.js';

// 初始化顶栏交互（供 main.js 在 i18n 就绪后调用）
export function initNavWiring() {
    // 顶栏导航与 CTA：data-goto-tab 触发对应展厅按钮，data-scroll 平滑滚动到目标板块
    document.querySelectorAll('[data-goto-tab]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById(el.getAttribute('data-goto-tab'));
            if (target) target.click();
        });
    });
    document.querySelectorAll('[data-scroll]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const sel = el.getAttribute('data-scroll');
            const target = document.querySelector(sel);
            if (target) {
                suspendSpy();
                target.scrollIntoView({ behavior: 'smooth' });
            }
            syncNavActive(`.nav a[data-scroll="${sel}"]`);
            history.replaceState(null, '', el.getAttribute('href') || '#map');
        });
    });

    // 顶栏下拉菜单（巡演探索 / 语言选择）
    const navDropdowns = document.querySelectorAll('.nav-dropdown');
    const setDdOpen = (dd, open) => {
        dd.classList.toggle('open', open);
        const t = dd.querySelector('.nav-drop-toggle');
        if (t) t.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    navDropdowns.forEach(dd => {
        const toggle = dd.querySelector('.nav-drop-toggle');
        if (!toggle) return;
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const open = !dd.classList.contains('open');
            navDropdowns.forEach(o => setDdOpen(o, o === dd && open));
        });
        dd.querySelectorAll('.nav-drop-menu a').forEach(a =>
            a.addEventListener('click', () => setDdOpen(dd, false))
        );
    });
    document.addEventListener('click', (e) => {
        navDropdowns.forEach(dd => {
            if (!dd.contains(e.target)) setDdOpen(dd, false);
        });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') navDropdowns.forEach(dd => setDdOpen(dd, false));
    });

    // 左上角标题：平滑回到页面顶部
    const brand = document.querySelector('a.brand');
    if (brand) {
        brand.addEventListener('click', (e) => {
            e.preventDefault();
            suspendSpy();
            history.replaceState(null, '', '#top');
            syncNavActive(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}
