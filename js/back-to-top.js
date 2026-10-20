(function () {
    let scrollTarget = null;
    let btn = null;

    function init() {
        btn = document.getElementById('backToTopBtn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const contentDiv = document.getElementById('content');
            const contentVisible = contentDiv && contentDiv.style.display !== 'none';
            const hall = document.getElementById('hall');
            if (contentVisible && hall) {
                hall.scrollIntoView({ behavior: 'smooth' });
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
