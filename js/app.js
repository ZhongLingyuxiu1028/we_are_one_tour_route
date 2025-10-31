function getToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

let itineraryData = null;
let chart = null;

// 初始化 ECharts 实例
function initChart() {
    if (!chart) {
        chart = echarts.init(document.getElementById('map'));
    }
}

// 渲染地图（根据类型）
function renderMap(mapType, fullItinerary) {
    const today = getToday();

    // 根据地图类型过滤数据
    const itinerary = mapType === 'china'
        ? fullItinerary.filter(item => item.country === 'China')
        : fullItinerary;

    // 如果过滤后没有数据，清空图表并提示
    if (itinerary.length === 0) {
        chart.setOption({ series: [], geo: { map: mapType } }, true);
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
            itemStyle: { areaColor: '#BBDEFB', borderColor: '#1976D2' }
        }));
    } else {
        const countries = new Set(
            fullItinerary.map(item => item.country).filter(Boolean)
        );
        regions = Array.from(countries).map(name => ({
            name: name,
            itemStyle: { areaColor: '#BBDEFB', borderColor: '#1976D2' }
        }));
    }

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function (params) {
                if (params.seriesType === 'effectScatter') {
                    const { name, date } = params.data;
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
window.addEventListener('resize', function() {
    if (chart) {
        chart.resize();
    }
});