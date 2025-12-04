// js/emoji-effect.js

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (e) {
        // 定义要显示的 emoji
        const emojis = ['❤️', '💖', '💗', '💓', '✨', '🌟', '💫', '💞', '💕', '❣️', '💝','🧡','💛','💜'];
        // 随机决定这次点击要生成几个 emoji（例如 1 到 3 个）
        const count = Math.floor(Math.random() * 2) + 1; // 1, 2, 或 3

        for (let i = 0; i < count; i++) {
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

            const emojiElement = document.createElement('span');
            emojiElement.textContent = randomEmoji;
            emojiElement.style.cssText = `
                position: absolute;
                top: ${e.clientY + (Math.random() - 0.5) * 40}px;   /* 微微上下偏移 */
                left: ${e.clientX + (Math.random() - 0.5) * 40}px;  /* 微微左右偏移 */
                font-size: ${16 + Math.random() * 8}px;             /* 随机大小：16~24px */
                pointer-events: none;
                user-select: none;
                animation: emoji-float 1.5s ease-out forwards;
                z-index: 9999;
                opacity: ${0.7 + Math.random() * 0.3};              /* 随机透明度 */
            `;

            document.body.appendChild(emojiElement);

            // 自动清理
            setTimeout(() => {
                emojiElement.remove();
            }, 1500);
        }
    });
});