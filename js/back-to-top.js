(function () {
    let scrollTarget = null;
    let btn = null;

    function init() {
        btn = document.getElementById('backToTopBtn');
        if (!btn) return;

        // 点击返回顶部
        btn.addEventListener('click', () => {
            if (!scrollTarget) return;

            if (scrollTarget === window) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                scrollTarget.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    function handleScroll() {
        if (!btn || !scrollTarget) return;

        let scrollTop = 0;

        if (scrollTarget === window) {
            scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        } else {
            scrollTop = scrollTarget.scrollTop;
        }

        // 判断 content 是否显示
        const contentDiv = document.getElementById('content');
        const contentVisible = contentDiv && contentDiv.style.display !== 'none';

        // ✅ 只在内容页显示
        if (scrollTop > 200 && contentVisible && scrollTarget !== window) {
            btn.classList.add('show');
        } else {
            btn.classList.remove('show');
        }
    }

    function bind(target) {
        // 解绑旧的
        if (scrollTarget) {
            scrollTarget.removeEventListener('scroll', handleScroll);
        }

        scrollTarget = target;

        if (scrollTarget) {
            scrollTarget.addEventListener('scroll', handleScroll);
            handleScroll();
        } else {
            // 没有目标时直接隐藏
            btn?.classList.remove('show');
        }
    }

    // 暴露接口（给外部用）
    window.BackToTop = {
        init,
        bind
    };

    // 自动初始化
    document.addEventListener('DOMContentLoaded', init);
})();