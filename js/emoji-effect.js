// js/emoji-effect.js

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function () {
    let isLongPressActive = false;
    let lastClientX = 0;
    let lastClientY = 0;
    let longPressTimer = null;
    let intervalId = null;

    const LONG_PRESS_DELAY = 300; // 长按判定时间（毫秒）

    // 获取当前鼠标在文档中的真实位置（结合滚动）
    function getCurrentPageXY() {
        return {
            x: window.scrollX + lastClientX,
            y: window.scrollY + lastClientY
        };
    }

    // 更新 client 坐标（来自 mousemove 或 mousedown）
    function updateClientPos(e) {
        lastClientX = e.clientX;
        lastClientY = e.clientY;
    }

    // 鼠标移动时更新
    document.addEventListener('mousemove', updateClientPos);

    // 鼠标按下
    document.addEventListener('mousedown', function (e) {
        updateClientPos(e); // 记录 client 坐标

        longPressTimer = setTimeout(() => {
            isLongPressActive = true;
            intervalId = setInterval(() => {
                const { x, y } = getCurrentPageXY(); // 每次都重新计算！
                createEmoji(x, y);
            }, 120);
        }, LONG_PRESS_DELAY);
    });

    // 鼠标释放或离开
    function stopAll() {
        if (longPressTimer) clearTimeout(longPressTimer);
        if (intervalId) clearInterval(intervalId);
        isLongPressActive = false;
        longPressTimer = null;
        intervalId = null;
    }

    // 单击处理（短按）
    document.addEventListener('mouseup', function (e) {
        if (!isLongPressActive && longPressTimer) {
            clearTimeout(longPressTimer);
            const { x, y } = getCurrentPageXY();
            const count = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < count; i++) {
                createEmoji(x, y);
            }
        }
        stopAll();
    });

    document.addEventListener('mouseleave', stopAll);

    // （虽然 clientX/Y 没变，但 scrollX/Y 变了）
    window.addEventListener('scroll', () => {
        // 不需要做任何事，getCurrentPageXY() 会自动用最新的 scrollX/Y
    }, { passive: true });

    // 创建 emoji 的函数（复用）
    function createEmoji(x, y) {
        const emojis = ['❤️', '💖', '💗', '💓', '✨', '🌟', '💫', '💞', '💕', '❣️', '💝', '🧡', '💛', '💜'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

        const emojiElement = document.createElement('span');
        emojiElement.textContent = randomEmoji;
        emojiElement.style.cssText = `
            position: absolute;
            top: ${y + (Math.random() - 0.5) * 40}px;
            left: ${x + (Math.random() - 0.5) * 40}px;
            font-size: ${16 + Math.random() * 8}px;
            pointer-events: none;
            user-select: none;
            animation: emoji-float 1.5s ease-out forwards;
            z-index: 9999;
            opacity: ${0.7 + Math.random() * 0.3};
        `;

        document.body.appendChild(emojiElement);
        setTimeout(() => emojiElement.remove(), 1500);
    }
});