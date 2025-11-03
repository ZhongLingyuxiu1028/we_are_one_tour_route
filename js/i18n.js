// js/i18n.js

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
        document.dispatchEvent(new CustomEvent('i18nReady', {
            detail: { lang: this.currentLang }
        }));
    }

    async loadTranslations(lang) {
        try {
            const response = await fetch(`js/i18n/${lang}.json`);
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

    t(key) {
        return this.translations[key] || key;
    }

    async setLang(lang) {
        await this.loadTranslations(lang);
        this.applyTranslations();

        // ✅ 关键新增：语言切换完成后，触发自定义事件
        document.dispatchEvent(new CustomEvent('i18n:langChanged', {
            detail: { lang: this.currentLang }
        }));

        // ✅ 兼容性兜底：如果存在 reloadActiveTab 函数，也调用它
        if (typeof window.reloadActiveTab === 'function') {
            window.reloadActiveTab();
        }
    }

    getSavedLang() {
        return localStorage.getItem('lang');
    }

    setupLangSwitch() {
        const select = document.getElementById('lang-switch');
        if (select) {
            select.value = this.currentLang;
            select.addEventListener('change', (e) => {
                this.setLang(e.target.value);
            });
        }
    }
}

const i18n = new I18n();

// 全局函数（可选）
window.setLanguage = (lang) => i18n.setLang(lang);