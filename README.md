# 林子祥 & 叶蒨文 ❤️ 白头到老 · We Are One

> George Lam & Sally Yeh · 《白头到老 / We Are One》世界巡回演唱会 2025–2026 · 野生观察站

**[在线预览](https://zhonglingyuxiu1028.github.io/we_are_one_tour_route/)** · 施工中，持续更新 \~

## 目录结构

```text
├── index.html            # 单页入口（地图 + 展厅骨架）
├── css/                  # 样式（tokens / style / setlist / 对比表 / 统计表 / 灯箱 / 回到顶部等）
├── js/
│   ├── app.js            # 地图渲染、行程解析、站点点击 → 歌单
│   ├── tabs.js           # 展厅 Tab、hash 路由、内容增强（章节卡/对比表/歌词抽屉等）
│   ├── i18n.js + i18n/   # 多语言（zh-CN / zh-HK / en）
│   ├── statistical-table.js  # 进度看板渲染
│   ├── emoji-effect.js   # 点击爱心特效
│   └── back-to-top.js    # 回到顶部
├── data/
│   ├── json/itinerary.json        # 巡演行程（站点/日期/坐标）
│   ├── json/statistical-table.json# 进度看板统计
│   ├── songlist.md                # 预习曲目
│   ├── diary.md                   # 巡演日记
│   ├── about/                     # 大事记 / 站点说明（按日期多篇）
│   ├── bonus/                     # 彩蛋环节（图文，多篇）
│   ├── credits.md                 # 致谢名单
│   ├── setlist/                   # 各站歌单（<城市>.html）
│   └── lyrics/                    # 歌词 Markdown（chapter1–6 + encore 分目录）
├── img/                  # 图片素材（头像 / 彩蛋 / 日记照片 / 工作人员等）
├── fonts/                # 子集化字体（woff2）
├── lib/                  # 第三方库（ECharts + 中国/世界地图 GeoJSON、marked、灯箱）
├── tools/subset-fonts.js # 字体子集化脚本
└── docs/                 # 设计文档 + README 截图（docs/screenshots/）
```

## 说明

* 本站为乐迷自制「野生观察站」，非官方站点，仅作资料整理与分享

* 感谢 Lam & Sally、所有工作人员，以及提供素材与帮助的热心网友们

* Design By Michelle Chung © 2025-2026

