// js/emoji-effect.js

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function () {
    let isLongPressActive = false;
    let currentX = 0;
    let currentY = 0;
    let longPressTimer = null;
    let intervalId = null;

    const LONG_PRESS_DELAY = 300; // 长按判定时间（毫秒）

    // 实时更新鼠标位置（即使在长按中移动）
    document.addEventListener('mousemove', function (e) {
        currentX = e.pageX;
        currentY = e.pageY;
    });

    // 鼠标按下
    document.addEventListener('mousedown', function (e) {
        // 初始化位置
        currentX = e.pageX;
        currentY = e.pageY;

        // 设置长按计时器
        longPressTimer = setTimeout(() => {
            isLongPressActive = true;
            // 开始持续生成 emoji（使用 currentX/Y，会自动更新）
            intervalId = setInterval(() => {
                createEmoji(currentX, currentY);
            }, 120); // 每120ms一个，可调整
        }, LONG_PRESS_DELAY);
    });

    // 鼠标释放或离开
    function stopAll() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        isLongPressActive = false;
    }

    // 单击处理（短按）
    document.addEventListener('mouseup', function () {
        if (!isLongPressActive && longPressTimer) {
            // 是短按！
            clearTimeout(longPressTimer);
            longPressTimer = null;
            // 触发单击效果
            const count = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < count; i++) {
                createEmoji(currentX, currentY);
            }
        }
        stopAll();
    });

    document.addEventListener('mouseleave', stopAll);

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