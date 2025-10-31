// js/tabs.js

document.addEventListener('DOMContentLoaded', () => {
    const mapEl = document.getElementById('map');
    const contentEl = document.getElementById('content');

    // 按钮元素
    const btnChina = document.getElementById('btnChina');
    const btnWorld = document.getElementById('btnWorld');
    const btnSetlist = document.getElementById('btnSetlist');
    const btnStaffs = document.getElementById('btnStaffs');

    // 所有控制按钮
    const allButtons = [btnChina, btnWorld, btnSetlist, btnStaffs];

    function setActive(button) {
        allButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }

    function showMap() {
        mapEl.style.display = 'block';
        contentEl.style.display = 'none';
    }

    function showContent() {
        mapEl.style.display = 'none';
        contentEl.style.display = 'block';
    }

    // 默认显示地图（中国地图）
    setActive(btnChina);
    showMap();

    // 地图按钮
    btnChina.addEventListener('click', () => {
        setActive(btnChina);
        showMap();
        if (window.switchMap) window.switchMap('china');
    });

    btnWorld.addEventListener('click', () => {
        setActive(btnWorld);
        showMap();
        if (window.switchMap) window.switchMap('world');
    });

    // 致谢名单
    btnStaffs.addEventListener('click', async () => {
        setActive(btnStaffs);
        showContent();
        contentEl.innerHTML = '<div class="loading">正在加载致谢名单...</div>';
        try {
            const response = await fetch('data/staffs.md');
            if (response.ok) {
                const text = await response.text();
                const html = marked.parse(text);
                contentEl.innerHTML = `
                    <!--<div class="content-header">🙏 致谢名单</div>-->
                    <div class="content-body">${html}</div>
                `;
            } else {
                contentEl.innerHTML = '<div class="error">⚠️ 致谢名单未找到</div>';
            }
        } catch (err) {
            contentEl.innerHTML = '<div class="error">❌ 加载失败，请稍后再试。</div>';
        }
    });

    // 演出歌单 - 加载城市列表
    btnSetlist.addEventListener('click', async () => {
        setActive(btnSetlist);
        showContent();
        contentEl.innerHTML = '<div class="loading">正在加载演出城市列表...</div>';

        try {
            // 从全局获取行程数据，避免重复请求
            if (window.itineraryData) {
                const itinerary = window.itineraryData;
                renderSetlistSelector(itinerary);
            } else {
                // 如果全局数据未加载，从文件获取
                const response = await fetch('data/itinerary.json');
                if (response.ok) {
                    const itinerary = await response.json();
                    renderSetlistSelector(itinerary);
                } else {
                    contentEl.innerHTML = '<div class="error">⚠️ 演出计划未找到</div>';
                }
            }
        } catch (err) {
            contentEl.innerHTML = '<div class="error">❌ 加载演出计划失败，请稍后再试。</div>';
        }
    });

    // 渲染歌单选择器的函数
    function renderSetlistSelector(itinerary) {
        // 生成城市选择器HTML
        let cityOptions = '';
        itinerary.forEach((event, index) => {
            // 修正：使用 event['setlist-name'] 访问JSON中的字段
            const setlistName = event['setlist-name'] || `_0${index + 1}_${event.city.replace('（未官宣）', '').replace(' ', '')}`;
            cityOptions += `<option value="${setlistName}" data-index="${index}">${event.name} (${event.date})</option>`;
        });

        contentEl.innerHTML = `
        <!--<div class="content-header">🎤 演出歌单</div>-->
        <div class="city-selector">
            <label for="citySelect">选择城市:</label>
            <select id="citySelect">
                <option value="">请选择演出城市</option>
                ${cityOptions}
            </select>
        </div>
        <div id="songListContent" style="margin-top: 16px;"></div>
    `;

        // 添加城市选择事件监听
        document.getElementById('citySelect').addEventListener('change', async (e) => {
            const selectedValue = e.target.value;
            const selectedIndex = e.target.options[e.target.selectedIndex].dataset.index;

            if (!selectedValue) {
                document.getElementById('songListContent').innerHTML = '<div class="loading">请选择一个城市查看歌单</div>';
                return;
            }

            document.getElementById('songListContent').innerHTML = '<div class="loading">正在加载歌单...</div>';

            try {
                // 构建文件路径 - 使用修正后的字段值
                const filePath = `data/setlist/${selectedValue}.md`;
                const response = await fetch(filePath);

                if (response.ok) {
                    const text = await response.text();
                    const html = marked.parse(text);

                    // 找到对应的城市信息用于显示
                    const eventInfo = itinerary[parseInt(selectedIndex)];

                    document.getElementById('songListContent').innerHTML = `
                    <div class="city-info">
                        <strong>演出信息</strong><br>
                        <b>场馆</b>: ${eventInfo.location}<br>
                        <b>日期</b>: ${eventInfo.date}<br>
                        <b>地点</b>: ${eventInfo.province} ${eventInfo.city}
                    </div>
                    <div class="content-body">${html}</div>
                `;
                } else {
                    document.getElementById('songListContent').innerHTML = '<div class="error">⚠️ 该城市歌单暂未开放</div>';
                }
            } catch (err) {
                document.getElementById('songListContent').innerHTML = '<div class="error">❌ 加载歌单失败，请稍后再试。</div>';
            }
        });
    }

});