// js/i18n.js

// 文案缓存版本号：i18n JSON 有增删时同步升级，避免浏览器 fetch 缓存旧文案
const I18N_VER = '20261027-9';

class I18n {
    constructor() {
        this.defaultLang = 'zh-CN';
        this.currentLang = this.getSavedLang() || this.defaultLang;
        this.translations = {};
        this.init();
    }

    async init() {
        await this.loadTranslations(this.currentLang);
        this.applyTranslations();
        this.setupLangSwitch();

        // 通知 i18n 已就绪
        // 置位标记供 ES module 入口兜底（模块延迟执行，可能错过本事件）
        window.__i18nReady = true;
        document.dispatchEvent(new CustomEvent('i18nReady', {
            detail: { lang: this.currentLang }
        }));
    }

    async loadTranslations(lang) {
        try {
            const response = await fetch(`js/i18n/${lang}.json?v=${I18N_VER}`);
            if (!response.ok) throw new Error(`Language file ${lang}.json not found`);
            this.translations = await response.json();
            this.currentLang = lang;
            localStorage.setItem('lang', lang);
            document.documentElement.lang = lang;
        } catch (e) {
            console.error(`Failed to load translations for ${lang}:`, e);
            if (lang !== this.defaultLang) {
                await this.loadTranslations(this.defaultLang);
            }
        }
    }

    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = this.t(key);
        });
    }

    // 增强 t 方法以支持变量替换
    t(key, params = {}) {
        let str = this.translations[key] || key;
        // 简单变量替换：{name} → params.name
        return str.replace(/\{(\w+)\}/g, (match, p1) => {
            return params[p1] !== undefined ? params[p1] : match;
        });
    }

    async setLang(lang) {
        await this.loadTranslations(lang);
        this.applyTranslations();
        this.updateLangMenu();

        // ✅ 关键新增：语言切换完成后，触发自定义事件
        document.dispatchEvent(new CustomEvent('i18n:langChanged', {
            detail: { lang: this.currentLang }
        }));

        // ✅ 兼容性兜底：如果存在 reloadActiveTab 函数，也调用它
        if (typeof window.reloadActiveTab === 'function') {
            window.reloadActiveTab();
        }

        // 切换语言后回到页面顶部（覆盖 langChanged 链路中的地图/展厅滚动）
        if (window.ScrollSpy) window.ScrollSpy.suspend();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    getSavedLang() {
        return localStorage.getItem('lang');
    }

    setupLangSwitch() {
        // 兼容原生 select（若存在）
        const select = document.getElementById('lang-switch');
        if (select) {
            select.value = this.currentLang;
            select.addEventListener('change', (e) => {
                this.setLang(e.target.value);
            });
        }
        // 顶栏自定义语言下拉
        this.langMenuMap = {
            'zh-CN': '🇨🇳 简体中文',
            'zh-HK': '🇨🇳 繁體中文',
            'en': '🇺🇸 English'
        };
        document.querySelectorAll('#langMenu [data-lang]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                this.setLang(el.getAttribute('data-lang'));
            });
        });
        this.updateLangMenu();
    }

    // 同步语言下拉按钮文案与当前语言高亮
    updateLangMenu() {
        const cur = document.getElementById('lang-current');
        if (cur) cur.textContent = this.langMenuMap[this.currentLang] || this.currentLang;
        document.querySelectorAll('#langMenu [data-lang]').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-lang') === this.currentLang);
        });
    }
}

const i18n = new I18n();

// 全局函数（可选）
window.setLanguage = (lang) => i18n.setLang(lang);

window.i18n = i18n;