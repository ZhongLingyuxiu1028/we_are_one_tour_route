// js/app.js

function getToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

let itineraryData = null;
let chart = null;
let currentMapType = 'china'; // 记录当前地图类型

// 初始化 ECharts 实例
function initChart() {
    if (!chart) {
        chart = echarts.init(document.getElementById('map'));

        // 添加点击事件监听
        chart.on('click', function (params) {
            if (params.seriesType === 'effectScatter') {
                // 找到对应的数据项
                const clickedItem = itineraryData.find(item =>
                    item.name === params.name
                );

                if (clickedItem) {
                    // 跳转到歌单页面
                    showSetlistForItem(clickedItem);
                }
            }
        });
    }
}

// 显示特定项目的歌单
function showSetlistForItem(item) {
    // 隐藏地图，显示内容区域
    document.getElementById('map').style.display = 'none';
    document.getElementById('content').style.display = 'block';

    // 激活歌单按钮
    const btnSetlist = document.getElementById('btnSetlist');
    const allButtons = [
        document.getElementById('btnChina'),
        document.getElementById('btnWorld'),
        btnSetlist,
        document.getElementById('btnStaffs'),
        document.getElementById('btnBonus'),
        document.getElementById('btnAbout')
    ];

    allButtons.forEach(btn => btn.classList.remove('active'));
    btnSetlist.classList.add('active');

    // 渲染歌单内容
    renderSetlistForItem(item);
}

// 渲染特定项目的歌单
function renderSetlistForItem(item) {
    const contentEl = document.getElementById('content');

    // 标准化文件名：转为小写，替换特殊字符
    let setlistName = item['setlist-name'] || '';
    setlistName = setlistName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    contentEl.innerHTML = `
        <div class="back-to-list">
            <button onclick="goBackToMap()" style="margin-bottom: 16px; padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">← 返回地图</button>
        </div>
        <div class="city-info">
            <h3>🎤 ${item.name}</h3>
            <strong>演出信息:</strong><br>
            场馆: ${item.location}<br>
            日期: ${item.date}<br>
            地点: ${item.province} ${item.city}
        </div>
        <div id="songListContent" style="margin-top: 16px;"></div>
    `;

    // 加载歌单内容
    loadSongList(setlistName, item);
}

// 加载歌单内容
async function loadSongList(setlistName, item) {
    const contentEl = document.getElementById('songListContent');

    if (!setlistName) {
        contentEl.innerHTML = '<div class="warning">⚠️ 歌单名称未设置</div>';
        return;
    }

    try {
        // 构建HTML文件路径
        const htmlFilePath = `./data/setlist/${setlistName}.html`;

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

            contentEl.innerHTML = `<div class="content-body">${html}</div>`;
            console.log('HTML文件加载成功:', htmlFilePath);
        } else {
            // 如果HTML文件不存在，尝试加载MD文件作为备选
            console.warn('HTML文件不存在，尝试加载MD文件:', htmlFilePath);

            const mdFilePath = `./data/setlist/${setlistName}.md`;
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
                contentEl.innerHTML = `<div class="content-body">${html}</div>`;

                console.log('MD文件加载成功:', mdFilePath);
            } else {
                // 检查是否是（未官宣）的情况
                const isUnofficial = item.city.includes('（未官宣）') || item['setlist-name'] === '';

                contentEl.innerHTML = `
                    <div class="warning">
                        ${isUnofficial
                    ? '⚠️ 该城市演出信息暂未官宣，歌单待发布'
                    : `⚠️ 歌单文件尚未发布 (${setlistName}.html 或 ${setlistName}.md)`}
                        <br><small>预期路径: ${htmlFilePath} 或 ${mdFilePath}</small>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error('加载歌单失败:', err);

        // 检查是否是网络问题
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
            contentEl.innerHTML = `
                <div class="error">
                    ❌ 网络连接问题，请检查文件路径是否正确<br>
                    <small>错误: ${err.message}</small>
                </div>
            `;
        } else {
            contentEl.innerHTML = `
                <div class="error">
                    ❌ 加载歌单失败，请稍后再试<br>
                    <small>错误: ${err.message}</small>
                </div>
            `;
        }
    }
}

// 返回地图函数
function goBackToMap() {
    document.getElementById('map').style.display = 'block';
    document.getElementById('content').style.display = 'none';

    // 恢复地图按钮的激活状态，保持之前选择的地图类型
    const btnChina = document.getElementById('btnChina');
    const btnWorld = document.getElementById('btnWorld');
    const allButtons = [
        btnChina,
        btnWorld,
        document.getElementById('btnSetlist'),
        document.getElementById('btnStaffs'),
        document.getElementById('btnBonus'),
        document.getElementById('btnAbout')
    ];

    allButtons.forEach(btn => btn.classList.remove('active'));

    // 根据当前地图类型激活相应的按钮
    if (currentMapType === 'world') {
        btnWorld.classList.add('active');
    } else {
        btnChina.classList.add('active');
    }

    // 重新渲染当前地图类型
    if (itineraryData) {
        renderMap(currentMapType, itineraryData);
    }
}

// 渲染地图（根据类型）
function renderMap(mapType, fullItinerary) {
    // 更新当前地图类型
    currentMapType = mapType;

    const today = getToday();

    // 根据地图类型过滤数据
    const itinerary = mapType === 'china'
        ? fullItinerary.filter(item => item.country === 'China')
        : fullItinerary;

    // 如果过滤后没有数据，清空图表并提示
    if (itinerary.length === 0) {
        chart.setOption({series: [], geo: {map: mapType}}, true);
        return;
    }

    // 构建点数据
    const points = itinerary.map((item, index) => {
        const dateParts = item.date.split('至');
        const startDateStr = dateParts[0].trim();
        const endDateStr = dateParts[1] ? dateParts[1].trim() : startDateStr;
        const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
        const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
        const startDate = new Date(startYear, startMonth - 1, startDay);
        const endDate = new Date(endYear, endMonth - 1, endDay);

        let color;
        if (item.name.includes('未官宣') || item.name.includes('测试')) {
            color = '#9E9E9E';
        } else if (endDate < today) {
            color = '#4CAF50';
        } else if (startDate <= today && today <= endDate) {
            color = '#2196F3';
        } else {
            color = '#F44336';
        }

        const labelCity = `第${index + 1}站：${item.city}`;

        return {
            name: item.name,
            value: [...item.coord, labelCity],
            date: item.date,
            city: item.city,
            itemStyle: {color: color},
            label: {
                show: true,
                position: 'right',
                formatter: '{@[2]}',
                color: '#333',
                fontSize: mapType === 'china' ? 12 : 10
            }
        };
    });

    // 构建连线（仅在有至少两个点时）
    const lines = [];
    for (let i = 0; i < itinerary.length - 1; i++) {
        lines.push({
            coords: [itinerary[i].coord, itinerary[i + 1].coord]
        });
    }

    // 地图区域高亮配置
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

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function (params) {
                if (params.seriesType === 'effectScatter') {
                    const {name, date} = params.data;
                    const dateParts = date.split('至');
                    const startDateStr = dateParts[0].trim();
                    const endDateStr = dateParts[1] ? dateParts[1].trim() : startDateStr;
                    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
                    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
                    const startDate = new Date(startYear, startMonth - 1, startDay);
                    const endDate = new Date(endYear, endMonth - 1, endDay);

                    let statusText;
                    if (name.includes('未官宣') || name.includes('测试')) {
                        statusText = '⚫ 未官宣';
                    } else if (endDate < today) {
                        statusText = '🟢 已结束';
                    } else if (startDate <= today && today <= endDate) {
                        statusText = '🔵 进行中';
                    } else {
                        statusText = '🔴 未开始';
                    }

                    return `${name}<br/>${date}<br/>${statusText}`;
                }
                return params.name;
            }
        },
        geo: {
            map: mapType,
            roam: true,
            zoom: mapType === 'china' ? 1.2 : 1.0,
            center: mapType === 'world' ? [110, 20] : null,
            label: {show: false},
            itemStyle: {areaColor: '#f0f9ff', borderColor: '#999'},
            emphasis: {label: {show: true}},
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
                rippleEffect: {show: false}
            }
        ]
    };

    chart.setOption(option, true);
}

// 切换地图
function switchMap(mapType) {
    if (!itineraryData) return;
    renderMap(mapType, itineraryData);
    // 更新按钮样式
    document.getElementById('btnChina').classList.toggle('active', mapType === 'china');
    document.getElementById('btnWorld').classList.toggle('active', mapType === 'world');
}

// 页面加载后执行
fetch('data/itinerary.json')
    .then(response => response.json())
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
    document.getElementById('btnChina').addEventListener('click', () => switchMap('china'));
    document.getElementById('btnWorld').addEventListener('click', () => switchMap('world'));
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