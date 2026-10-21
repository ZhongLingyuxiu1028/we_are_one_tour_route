(function () {
    let scrollTarget = null;
    let btn = null;

    function init() {
        btn = document.getElementById('backToTopBtn');
        if (!btn) return;

        // 分区域行为：
        //  - 已滚入内容展厅内部（Tab 内容展开时）→ 回到展厅顶部，便于重新选择 Tab
        //  - 其他位置（hero / 进度 / 地图等展厅之外）→ 回到页面顶部
        // （此前会无条件滚向 #hall 锚点，导致在展厅上方点击反而向下滚动）
        btn.addEventListener('click', () => {
            const contentDiv = document.getElementById('content');
            const contentVisible = contentDiv && contentDiv.style.display !== 'none';
            const hall = document.getElementById('hall');
            if (window.ScrollSpy) window.ScrollSpy.suspend();
            if (contentVisible && hall && hall.getBoundingClientRect().top < 0) {
                // 留出固定顶栏（60px）的高度，避免展厅标题被遮挡
                const hallTop = hall.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: Math.max(0, hallTop - 70), behavior: 'smooth' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });

        bind(window);
    }

    function handleScroll() {
        if (!btn) return;
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        if (scrollTop > 400) {
            btn.classList.add('show');
        } else {
            btn.classList.remove('show');
        }
    }

    function bind(target) {
        if (scrollTarget) {
            scrollTarget.removeEventListener('scroll', handleScroll);
        }
        scrollTarget = window;
        scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
    }

    window.BackToTop = {
        init,
        bind
    };

    document.addEventListener('DOMContentLoaded', init);
})();
