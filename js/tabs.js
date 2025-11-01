// js/tabs.js

document.addEventListener('DOMContentLoaded', () => {
    const mapEl = document.getElementById('map');
    const contentEl = document.getElementById('content');

    // 按钮元素
    const btnChina = document.getElementById('btnChina');
    const btnWorld = document.getElementById('btnWorld');
    const btnSetlist = document.getElementById('btnSetlist');
    const btnStaffs = document.getElementById('btnStaffs');
    const btnBonus = document.getElementById('btnBonus');
    const btnAbout = document.getElementById('btnAbout');

    // 所有控制按钮
    const allButtons = [btnChina, btnWorld, btnSetlist, btnStaffs, btnBonus, btnAbout];

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

    // 彩蛋环节
    btnBonus.addEventListener('click', async () => {
        setActive(btnBonus);
        showContent();
        contentEl.innerHTML = '<div class="loading">正在加载彩蛋环节...</div>';
        try {
            const response = await fetch('data/bonus.md');
            if (response.ok) {
                const text = await response.text();
                const html = marked.parse(text);
                contentEl.innerHTML = `
                    <!--<div class="content-header">🎊 彩蛋环节</div>-->
                    <div class="content-body">${html}</div>
                `;
            } else {
                contentEl.innerHTML = '<div class="error">⚠️ 彩蛋环节未找到</div>';
            }
        } catch (err) {
            contentEl.innerHTML = '<div class="error">❌ 加载失败，请稍后再试。</div>';
        }
    });

    // 关于本站
    btnAbout.addEventListener('click', async () => {
        setActive(btnAbout);
        showContent();
        contentEl.innerHTML = '<div class="loading">正在加载关于本站...</div>';
        try {
            const response = await fetch('data/about.md');
            if (response.ok) {
                const text = await response.text();
                const html = marked.parse(text);
                contentEl.innerHTML = `
                    <!--<div class="content-header">💬 关于本站</div>-->
                    <div class="content-body">${html}</div>
                `;
            } else {
                contentEl.innerHTML = '<div class="error">⚠️ 关于本站未找到</div>';
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
            // 修正：使用 event['setlist-name'] 访问JSON中的字段，并进行文件名标准化
            let setlistName = event['setlist-name'] || `_0${index + 1}_${event.city.replace('（未官宣）', '').replace(' ', '')}`;

            // 标准化文件名：转为小写，替换特殊字符
            setlistName = setlistName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

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
                // 构建HTML文件路径
                const htmlFilePath = `./data/setlist/${selectedValue}.html`;

                console.log('尝试加载HTML文件:', htmlFilePath);

                // 尝试加载HTML文件
                const response = await fetch(htmlFilePath, {
                    method: 'GET',
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                });

                if (response.ok) {
                    const html = await response.text();

                    // 检查内容是否为空
                    if (!html.trim()) {
                        console.warn('HTML文件内容为空:', htmlFilePath);
                        throw new Error('文件内容为空');
                    }

                    // 找到对应的城市信息用于显示
                    const eventInfo = itinerary[parseInt(selectedIndex)];

                    document.getElementById('songListContent').innerHTML = `
                    <div class="city-info">
                        <strong>演出信息:</strong><br>
                        场馆: ${eventInfo.location}<br>
                        日期: ${eventInfo.date}<br>
                        地点: ${eventInfo.province} ${eventInfo.city}
                    </div>
                    <div class="content-body">${html}</div>
                `;

                    console.log('HTML文件加载成功:', htmlFilePath);
                } else {
                    // 如果HTML文件不存在，尝试加载MD文件作为备选
                    console.warn('HTML文件不存在，尝试加载MD文件:', htmlFilePath);

                    const mdFilePath = `./data/setlist/${selectedValue}.md`;
                    const mdResponse = await fetch(mdFilePath, {
                        method: 'GET',
                        headers: {
                            'Cache-Control': 'no-cache'
                        }
                    });

                    if (mdResponse.ok) {
                        const text = await mdResponse.text();

                        if (!text.trim()) {
                            console.warn('MD文件内容为空:', mdFilePath);
                            throw new Error('文件内容为空');
                        }

                        const html = marked.parse(text);
                        const eventInfo = itinerary[parseInt(selectedIndex)];

                        document.getElementById('songListContent').innerHTML = `
                        <div class="city-info">
                            <strong>演出信息</strong><br>
                            场馆: ${eventInfo.location}<br>
                            日期: ${eventInfo.date}<br>
                            地点: ${eventInfo.province} ${eventInfo.city}
                        </div>
                        <div class="content-body">${html}</div>
                    `;

                        console.log('MD文件加载成功:', mdFilePath);
                    } else {
                        // 检查是否是（未官宣）的情况
                        const eventInfo = itinerary[parseInt(selectedIndex)];
                        const isUnofficial = eventInfo.city.includes('（未官宣）') || eventInfo['setlist-name'] === '';

                        document.getElementById('songListContent').innerHTML = `
                        <div class="warning">
                            ${isUnofficial
                            ? '⚠️ 该城市演出信息暂未官宣，歌单待发布'
                            : `⚠️ 歌单文件尚未发布 (${selectedValue}.html 或 ${selectedValue}.md)`}
                            <br><small>预期路径: ${htmlFilePath} 或 ${mdFilePath}</small>
                        </div>
                    `;
                    }
                }
            } catch (err) {
                console.error('加载歌单失败:', err);

                // 检查是否是网络问题
                if (err.name === 'TypeError' && err.message.includes('fetch')) {
                    document.getElementById('songListContent').innerHTML = `
                    <div class="error">
                        ❌ 网络连接问题，请检查文件路径是否正确<br>
                        <small>错误: ${err.message}</small>
                    </div>
                `;
                } else {
                    document.getElementById('songListContent').innerHTML = `
                    <div class="error">
                        ❌ 加载歌单失败，请稍后再试<br>
                        <small>错误: ${err.message}</small>
                    </div>
                `;
                }
            }
        });
    }

});