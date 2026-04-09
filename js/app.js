// js/app.js

function getToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

let itineraryData = null;
let chart = null;
let currentMapType = 'china'; // 记录当前地图类型
let i18nInstance = null;

// 监听 i18n 就绪事件
document.addEventListener('i18nReady', (e) => {
    // 使用全局 i18n 实例
    i18nInstance = window.i18n || e.detail;
    if (itineraryData) {
        renderMap(currentMapType, itineraryData);
    }
});

// 监听语言切换事件，重新渲染地图和当前内容
document.addEventListener('i18n:langChanged', (e) => {
    if (itineraryData && i18nInstance) {
        // 检查当前是否在歌单页面（内容区域可见）
        const contentDiv = document.getElementById('content');
        const mapDiv = document.getElementById('map');
        if (contentDiv && mapDiv) {
            const contentVisible = contentDiv.style.display !== 'none';

            if (contentVisible) {
                // 如果在歌单页面，自动返回地图页面（不渲染歌单内容）
                goBackToMap();
            } else {
                // 如果在其他标签页（如预习曲目、致谢名单等），重新加载内容
                const activeTab = document.querySelector('.tab-button.active');
                if (activeTab && activeTab.id !== 'btnChina' && activeTab.id !== 'btnWorld') {
                    // 触发当前激活标签的点击事件以重新加载内容
                    if (typeof window.reloadActiveTab === 'function') {
                        window.reloadActiveTab();
                    }
                }
            }
        }

        // 总是重新渲染地图
        renderMap(currentMapType, itineraryData);
    }
});

// 缓存当前歌单项目
let currentSetlistItem = null;

// 显示特定项目的歌单
function showSetlistForItem(item) {
    // 缓存当前歌单项目
    currentSetlistItem = item;

    // 隐藏地图，显示内容区域
    const mapDiv = document.getElementById('map');
    const contentDiv = document.getElementById('content');
    if (mapDiv && contentDiv) {
        mapDiv.style.display = 'none';
        contentDiv.style.display = 'block';
    }

    // 激活歌单按钮
    const btnSetlist = document.getElementById('btnSetlist');
    const allButtons = [
        document.getElementById('btnChina'),
        document.getElementById('btnWorld'),
        btnSetlist,
        document.getElementById('btnCredits'),
        document.getElementById('btnBonus'),
        document.getElementById('btnAbout')
    ];

    if (allButtons.every(btn => btn)) {
        allButtons.forEach(btn => btn.classList.remove('active'));
        if (btnSetlist) btnSetlist.classList.add('active');
    }

    // 渲染歌单内容
    renderSetlistForItem(item);

}

// 渲染特定项目的歌单
function renderSetlistForItem(item) {
    const contentEl = document.getElementById('content');
    if (!contentEl) return;

    // 标准化文件名：转为小写，替换特殊字符
    let setlistName = item['setlist-name'] || '';
    setlistName = setlistName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    // 使用 i18n 翻译固定文本
    const title = i18nInstance ? i18nInstance.t('setlist.info.title') : '演出信息';
    const venue = i18nInstance ? i18nInstance.t('setlist.info.venue') : '场馆';
    const date = i18nInstance ? i18nInstance.t('setlist.info.date') : '日期';
    const locationText = i18nInstance ? i18nInstance.t('setlist.info.location') : '地点';
    const backText = i18nInstance ? i18nInstance.t('btn.return.map') : '返回地图';

    contentEl.innerHTML = `
        <div class="back-to-list">
            <button onclick="goBackToMap()" style="margin-bottom: 16px; padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">← ${backText}</button>
        </div>
        <div class="city-info">
            <h3>🎤 ${item.name}</h3>
            <strong>${title}:</strong><br>
            ${venue}: ${item.location}<br>
            ${date}: ${item.date}<br>
            ${locationText}: ${item.province} ${item.city}
        </div>
        <div id="songListContent" style="margin-top: 16px;"></div>
    `;

    // 加载歌单内容
    loadSongList(setlistName, item);
}

// 加载歌单内容
async function loadSongList(setlistName, item, isLanguageUpdate = false) {
    const contentEl = document.getElementById('songListContent');
    if (!contentEl) return;

    if (!setlistName) {
        const warning = i18nInstance ? i18nInstance.t('error.setlist.loadFailed') : '⚠️ 歌单名称未设置';
        contentEl.innerHTML = `<div class="warning">${warning}</div>`;
        return;
    }

    try {
        // 直接加载HTML文件，不考虑语言后缀
        const htmlFilePath = `./data/setlist/${setlistName}.html`;

        if (!isLanguageUpdate) {
            console.log('尝试加载HTML文件:', htmlFilePath);
        }

        // 尝试加载HTML文件
        let response = await fetch(htmlFilePath, {
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

            contentEl.innerHTML = `<div class="content-body">${html}</div>`;
            if (!isLanguageUpdate) {
                console.log('HTML文件加载成功:', response.url);
            }
        } else {
            // 如果HTML文件不存在，尝试加载MD文件作为备选
            const mdFilePath = `./data/setlist/${setlistName}.md`;

            if (!isLanguageUpdate) {
                console.warn('HTML文件不存在，尝试加载MD文件:', mdFilePath);
            }

            let mdResponse = await fetch(mdFilePath, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            if (mdResponse.ok) {
                const text = await mdResponse.text();

                if (!text.trim()) {
                    console.warn('MD文件内容为空:', mdResponse.url);
                    throw new Error('文件内容为空');
                }

                const html = marked.parse(text);
                contentEl.innerHTML = `<div class="content-body">${html}</div>`;

                if (!isLanguageUpdate) {
                    console.log('MD文件加载成功:', mdResponse.url);
                }
            } else {
                // 检查是否是（未官宣）的情况
                const isUnofficial = item.city.includes('（未官宣）') || item['setlist-name'] === '';

                if (isUnofficial) {
                    contentEl.innerHTML = `
                        <div class="warning">
                            ${i18nInstance ? i18nInstance.t('setlist.unofficial') : '⚠️ 该城市演出信息暂未官宣，歌单待发布'}
                            <br><small>预期路径: ${htmlFilePath} 或 ${mdFilePath}</small>
                        </div>
                    `;
                } else {
                    contentEl.innerHTML = `
                        <div class="warning">
                            ${i18nInstance ? i18nInstance.t('setlist.fileNotPublished').replace('⚠️', '') : `⚠️ 歌单文件尚未发布 (${setlistName}.html 或 ${setlistName}.md)`}
                            <br><small>预期路径: ${htmlFilePath} 或 ${mdFilePath}</small>
                        </div>
                    `;
                }
            }
        }
    } catch (err) {
        console.error('加载歌单失败:', err);

        // 检查是否是网络问题
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
            contentEl.innerHTML = `
                <div class="error">
                    ${i18nInstance ? i18nInstance.t('error.network') : '❌ 网络连接问题，请检查文件路径是否正确'}<br>
                    <small>错误: ${err.message}</small>
                </div>
            `;
        } else {
            contentEl.innerHTML = `
                <div class="error">
                    ${i18nInstance ? i18nInstance.t('error.setlist.loadFailed') : '❌ 加载歌单失败，请稍后再试'}<br>
                    <small>错误: ${err.message}</small>
                </div>
            `;
        }
    }
}

// 返回地图函数
function goBackToMap() {
    const mapDiv = document.getElementById('map');
    const contentDiv = document.getElementById('content');
    if (mapDiv && contentDiv) {
        mapDiv.style.display = 'block';
        contentDiv.style.display = 'none';
    }

    // 恢复地图按钮的激活状态，保持之前选择的地图类型
    const btnChina = document.getElementById('btnChina');
    const btnWorld = document.getElementById('btnWorld');
    const allButtons = [
        btnChina,
        btnWorld,
        document.getElementById('btnSetlist'),
        document.getElementById('btnCredits'),
        document.getElementById('btnBonus'),
        document.getElementById('btnAbout')
    ];

    if (allButtons.every(btn => btn)) {
        allButtons.forEach(btn => btn.classList.remove('active'));
    }

    // 根据当前地图类型激活相应的按钮
    if (currentMapType === 'world') {
        if (btnWorld) btnWorld.classList.add('active');
    } else {
        if (btnChina) btnChina.classList.add('active');
    }

    // 重新渲染当前地图类型
    if (itineraryData) {
        renderMap(currentMapType, itineraryData);
    }

    if (window.BackToTop) {
        window.BackToTop.bind(null);
    }
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const dateRange = dateStr.split('至');
    const startDateStr = dateRange[0].trim();
    const endDateStr = dateRange[1] ? dateRange[1].trim() : startDateStr;

    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);

    if (isNaN(startYear) || isNaN(startMonth) || isNaN(startDay)) return null;

    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = !isNaN(endYear) && !isNaN(endMonth) && !isNaN(endDay)
        ? new Date(endYear, endMonth - 1, endDay)
        : startDate;

    return { startDate, endDate };
}

function areCoordsEqual(coord1, coord2, tolerance = 0.001) {
    return Math.abs(coord1[0] - coord2[0]) < tolerance &&
        Math.abs(coord1[1] - coord2[1]) < tolerance;
}

function handleOverlappingCoords(itinerary) {
    const processedItinerary = itinerary.map(item => ({...item}));
    const coordGroups = {};
    processedItinerary.forEach((item, index) => {
        const coordKey = `${item.coord[0].toFixed(4)},${item.coord[1].toFixed(4)}`;
        if (!coordGroups[coordKey]) coordGroups[coordKey] = [];
        coordGroups[coordKey].push({index, item});
    });

    Object.values(coordGroups).forEach(group => {
        if (group.length > 1) {
            group.forEach((item, i) => {
                const angle = (i * 2 * Math.PI) / group.length;
                const offsetDistance = 0.02;
                const offsetX = Math.cos(angle) * offsetDistance;
                const offsetY = Math.sin(angle) * offsetDistance;
                processedItinerary[item.index].coord = [
                    item.item.coord[0] + offsetX,
                    item.item.coord[1] + offsetY
                ];
                processedItinerary[item.index].originalCoord = item.item.coord;
                processedItinerary[item.index].isOffset = true;
            });
        }
    });

    return processedItinerary;
}

// 增强版 renderMap，支持自动聚焦最近未完成站点或根据所有点展示最佳比例
function renderMap(mapType, fullItinerary) {
    // 安全检查：确保 i18n 实例已就绪
    if (!i18nInstance || !chart) return;

    // 更新当前地图类型
    currentMapType = mapType;

    const today = getToday();

    const coordMap = {};
    fullItinerary.forEach(item => {
        const key = `${item.coord[0].toFixed(4)},${item.coord[1].toFixed(4)}`;
        if (!coordMap[key]) coordMap[key] = [];
        coordMap[key].push(item);
    });
    window.coordMap = coordMap;

    // ===== 第一步：在原始数据中查找最近的未完成站点（用于聚焦）
    let focusCoord = null;
    let minDiff = Infinity;

    fullItinerary.forEach(item => {
        // 过滤当前地图类型范围内的数据
        if (mapType === 'china' && item.country !== 'China') return;
        if (mapType === 'world' && !item.country) return;

        const dateInfo = parseDate(item.date);
        if (!dateInfo) return;

        // 仅考虑尚未结束的场次（包括今天）
        if (dateInfo.endDate >= today) {
            const diff = Math.abs(dateInfo.startDate - today);
            if (diff < minDiff) {
                minDiff = diff;
                focusCoord = [...item.coord]; // 深拷贝原始坐标
            }
        }
    });

    // 如果没有未完成站点，则尝试聚焦到最后一个站点（可选）
    if (!focusCoord) {
        const lastItem = fullItinerary
            .filter(item => mapType === 'china' ? item.country === 'China' : true)
            .slice(-1)[0];
        if (lastItem) {
            focusCoord = [...lastItem.coord];
        }
    }

    // ===== 第二步：过滤并处理重叠 =====
    let itinerary = mapType === 'china'
        ? fullItinerary.filter(item => item.country === 'China')
        : fullItinerary;

    if (itinerary.length === 0) {
        chart.setOption({ series: [], geo: { map: mapType } }, true);
        return;
    }

    // 构建点数据
    const points = itinerary.map((item, index) => {
        const dateInfo = parseDate(item.date);
        const hasValidDate = dateInfo !== null;

        let color;
        if (item.name.includes('未官宣')) {
            color = '#9E9E9E';
        } else if (hasValidDate) {
            if (dateInfo.endDate < today) {
                color = '#4CAF50';
            } else if (dateInfo.startDate <= today && today <= dateInfo.endDate) {
                color = '#2196F3';
            } else {
                color = '#F44336';
            }
        } else {
            color = '#9E9E9E';
        }

        // 只显示城市名，避免编号重叠
        let labelCity = item.city;

        return {
            name: item.name,
            value: [...item.coord, labelCity],
            date: item.date,
            city: item.city,
            itemStyle: { color: color },
            label: {
                show: true,
                position: 'right',
                formatter: '{@[2]}',
                color: '#333',
                fontSize: mapType === 'china' ? 12 : 10
            }
        };
    });

    // 构建连线
    const lines = [];
    for (let i = 0; i < itinerary.length - 1; i++) {
        const current = parseDate(itinerary[i].date);
        const next = parseDate(itinerary[i + 1].date);
        if (current !== null && next !== null) {
            // lines.push({ coords: [itinerary[i].coord, itinerary[i + 1].coord] });
        }
    }

    // 地图区域高亮
    let regions = [];
    if (mapType === 'china') {
        const provinces = new Set(
            itinerary.map(item => item.province).filter(Boolean)
        );
        regions = Array.from(provinces).map(name => ({
            name: name,
            itemStyle: {areaColor: '#BBDEFB', borderColor: '#1976D2'}
        }));
    } else {
        const countries = new Set(
            fullItinerary.map(item => item.country).filter(Boolean)
        );
        regions = Array.from(countries).map(name => ({
            name: name,
            itemStyle: {areaColor: '#BBDEFB', borderColor: '#1976D2'}
        }));
    }

    // ===== 新增：计算所有点的边界框并自动适配地图视野 =====
    // ===== 优化版：根据所有点计算紧凑视野（带内边距）=====
    function getBoundsAndCenter(coords) {
        if (coords.length === 0) return { center: [105, 35], zoom: 1.2 };

        let minLng = Infinity, maxLng = -Infinity;
        let minLat = Infinity, maxLat = -Infinity;

        coords.forEach(([lng, lat]) => {
            if (lng == null || lat == null) return;
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
        });

        // 添加一点 padding（防止点紧贴边缘）
        const paddingRatio = 0.1; // 10% 边距
        const lngPadding = (maxLng - minLng) * paddingRatio;
        const latPadding = (maxLat - minLat) * paddingRatio;

        minLng -= lngPadding;
        maxLng += lngPadding;
        minLat -= latPadding;
        maxLat += latPadding;

        const center = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
        const lngRange = maxLng - minLng;
        const latRange = maxLat - minLat;

        // 防止除零（单点情况）
        if (lngRange === 0 && latRange === 0) {
            return {
                center: [coords[0][0], coords[0][1]],
                zoom: mapType === 'china' ? 5 : 4
            };
        }

        // 核心：通过视口与数据范围的比例反推 zoom
        // ECharts 地图的默认宽高比约为 2:1（经度跨度 ≈ 2×纬度跨度时视觉平衡）
        const aspectRatio = 2.0;
        const adjustedLatRange = latRange * aspectRatio;
        const maxRange = Math.max(lngRange, adjustedLatRange);

        let zoom;
        if (mapType === 'china') {
            // 中国地图在 zoom=1 时大约覆盖经度 180°，纬度 90°（虚拟坐标系）
            // 实际经验：zoom ≈ log2(360 / range) 更合理
            zoom = Math.log2(360 / maxRange);
            // 限制合理范围：至少 zoom=2（避免太小），最多 zoom=6（单城市级别）
            zoom = Math.min(6, Math.max(2, zoom));
        } else {
            // 世界地图：zoom=1 覆盖全球（360°经度）
            zoom = Math.log2(360 / maxRange);
            zoom = Math.min(5, Math.max(1.5, zoom)); // 世界地图可稍小一点
        }

        return {
            center: center,
            zoom: parseFloat(zoom.toFixed(1))
        };
    }

    // 提取当前地图类型下的所有有效坐标
    const visibleCoords = itinerary
        .filter(item => item.coord && Array.isArray(item.coord) && item.coord.length >= 2)
        .map(item => item.coord);

    const { center: finalCenter, zoom: finalZoom } = getBoundsAndCenter(visibleCoords);

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function (params) {
                if (params.seriesType === 'effectScatter') {
                    const value = params.data.value;
                    if (!Array.isArray(value) || value.length < 2) return params.name;

                    const lng = value[0];
                    const lat = value[1];
                    const key = `${lng.toFixed(4)},${lat.toFixed(4)}`;
                    const items = window.coordMap?.[key] || [];

                    return items.map(item => {
                        const dateInfo = parseDate(item.date);
                        const hasValidDate = dateInfo !== null;

                        let statusKey;
                        if (item.name.includes('未官宣')) {
                            statusKey = 'map.status.unofficial';
                        } else if (!hasValidDate) {
                            statusKey = 'map.status.pending';
                        } else if (dateInfo.endDate < getToday()) {
                            statusKey = 'map.status.finished';
                        } else if (dateInfo.startDate <= getToday() && getToday() <= dateInfo.endDate) {
                            statusKey = 'map.status.ongoing';
                        } else {
                            statusKey = 'map.status.upcoming';
                        }

                        const statusText = i18nInstance ? i18nInstance.t(statusKey) : statusKey;

                        return `<strong>${item.name}</strong><br/>${item.date}<br/>${statusText}`;
                    }).join('<br/><br/>');
                }

                return params.name;
            }
        },
        geo: {
            map: mapType,
            roam: true,
            zoom: finalZoom,
            center: finalCenter,
            label: { show: false },
            itemStyle: { areaColor: '#f0f9ff', borderColor: '#999' },
            emphasis: { label: { show: true } },
            regions: regions
        },
        series: [
            {
                type: 'lines',
                coordinateSystem: 'geo',
                data: lines,
                lineStyle: {
                    color: '#2196F3',
                    width: 3,
                    opacity: 0.8,
                    curveness: 0.2
                },
                effect: {
                    show: true,
                    period: 5,
                    trailLength: 0,
                    symbol: 'arrow',
                    symbolSize: 10
                }
            },
            {
                type: 'effectScatter',
                coordinateSystem: 'geo',
                data: points,
                symbolSize: 14,
                rippleEffect: { show: false }
            }
        ]
    };

    chart.setOption(option, true);
}

// 初始化 ECharts 实例
function initChart() {
    if (!chart) {
        const mapElement = document.getElementById('map');
        if (mapElement) {
            chart = echarts.init(mapElement);

            // 添加点击事件监听
            chart.on('click', function (params) {
                if (params.seriesType === 'effectScatter') {
                    const value = params.data.value;
                    if (!Array.isArray(value) || value.length < 2) return;

                    const lng = value[0];
                    const lat = value[1];
                    const key = `${lng.toFixed(4)},${lat.toFixed(4)}`;
                    const items = window.coordMap?.[key] || [];

                    if (items.length > 1) {
                        showStationSelector(items);
                    } else if (items.length === 1) {
                        const item = items[0];
                        const dateInfo = parseDate(item.date);
                        const hasValidDate = dateInfo !== null;

                        if (!hasValidDate) {
                            alert(i18nInstance
                                ? i18nInstance.t('map.pending.noJump') || '该站点信息待定，敬请期待...'
                                : '该站点信息待定，敬请期待...');
                        } else {
                            showSetlistForItem(item);
                        }
                    }
                }
            });
        }
    }
}

function showStationSelector(items) {
    const overlay = document.createElement('div');
    overlay.className = 'station-overlay';

    const box = document.createElement('div');
    box.className = 'station-box';

    const title = document.createElement('h3');
    title.textContent = i18nInstance ? i18nInstance.t('map.select.show') : '请选择演出场次';
    box.appendChild(title);

    items.forEach(item => {
        const btn = document.createElement('button');
        btn.textContent = `${item.name} - ${item.date}`;
        btn.onclick = () => {
            document.body.removeChild(overlay);
            showSetlistForItem(item);
        };
        box.appendChild(btn);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = i18nInstance ? i18nInstance.t('btn.cancel') : '取消';
    cancelBtn.className = 'cancel-btn';
    cancelBtn.onclick = () => document.body.removeChild(overlay);
    box.appendChild(cancelBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

// 切换地图
function switchMap(mapType) {
    if (!itineraryData) return;
    renderMap(mapType, itineraryData);
    // 更新按钮样式
    const btnChina = document.getElementById('btnChina');
    const btnWorld = document.getElementById('btnWorld');
    if (btnChina) btnChina.classList.toggle('active', mapType === 'china');
    if (btnWorld) btnWorld.classList.toggle('active', mapType === 'world');
}

// 页面加载后执行
fetch('data/itinerary.json')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(itinerary => {
        itineraryData = itinerary;
        initChart();
        switchMap('china'); // 默认中国地图
    })
    .catch(err => {
        console.error('加载行程数据失败:', err);
        alert('无法加载行程数据，请检查 data/itinerary.json 文件是否存在。');
    });

// 绑定按钮事件
document.addEventListener('DOMContentLoaded', () => {
    const btnChina = document.getElementById('btnChina');
    const btnWorld = document.getElementById('btnWorld');

    if (btnChina) {
        btnChina.addEventListener('click', () => switchMap('china'));
    }
    if (btnWorld) {
        btnWorld.addEventListener('click', () => switchMap('world'));
    }
});

// 窗口大小变化时自动重绘图表
window.addEventListener('resize', function () {
    if (chart) {
        chart.resize();
    }
});

// 暴露函数给全局，供 tabs.js 调用
window.renderMap = renderMap;
window.switchMap = switchMap;
window.itineraryData = itineraryData;
window.goBackToMap = goBackToMap;
window.parseDate = parseDate;
