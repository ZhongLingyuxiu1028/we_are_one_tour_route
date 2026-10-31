# 林子祥 & 叶蒨文 ❤️ 白头到老 · We Are One

> George Lam & Sally Yeh · 《白头到老 / We Are One》世界巡回演唱会 2025–2026 · 野生观察站

**[在线预览](https://zhonglingyuxiu1028.github.io/we_are_one_tour_route/)** · 施工中，持续更新 \~

## 里程碑时间线

* **2026-10-29** 全站图标统一替换为 twemoji
* **2026-10-28** 观演报告互动章节上线
* **2026-10-26** ★ 重大更新：观演报告互动章节（预览版）
* **2026-10-24** 文件目录结构重构、变化点折叠式改版
* **2026-10-22** ★ 歌单内容表格样式大重构
* **2026-10-21** 导航栏 + 首页全新设计
* **2026-10-20** ★ 重大更新：网站整体重新设计（AI 辅助）
* **2026-04-06** 统计表格模块上线
* **2026-04-03** 多场次架构适配（广州站二开）
* **2025-12-08** 巡演日程模块上线（2026-06-24 下线）
* **2025-12-04** 点击特效上线
* **2025-11-27** 全部曲目歌词施工完成（Chapter 1-6 + Encore）
* **2025-11-26** 预习曲目歌词弹窗
* **2025-11-22** 《十分十二吋》歌词谐音整理 + 影像资料整理
* **2025-11-21** simple-lightbox 图片预览
* **2025-11-03** i18n 国际化上线（zh-CN / zh-HK / en）
* **2025-10-31** 项目诞生 (init: map)，以巡演地图为核心的路书网站（AI 辅助）

## 目录结构

```text
├── index.html            # 单页入口（地图 + 展厅骨架）
├── css/                  # 样式（tokens / base / map / content / sections / responsive / setlist / 对比表 / 统计表 / 灯箱 / 回到顶部等）
├── js/
│   ├── app.js            # 地图渲染、行程解析、站点点击 → 歌单
│   ├── tabs/             # 展厅 ES modules：main.js 入口 + core/nav/scrollspy/setlist/songlist/report 等模块
│   ├── i18n.js + i18n/   # 多语言（zh-CN / zh-HK / en）
│   ├── statistical-table.js  # 进度看板渲染
│   ├── emoji-effect.js   # 点击爱心特效
│   └── back-to-top.js    # 回到顶部
├── data/
│   ├── json/itinerary.json        # 巡演行程（站点/日期/坐标）
│   ├── json/statistical-table.json# 进度看板统计
│   ├── json/report-data.json      # 观演回忆录数据（tools/gen-report-data.js 生成）
│   ├── songlist/                 # 预习曲目（intro 导览 + 各章节曲目表，每章一篇）
│   ├── diary.md                   # 巡演日记
│   ├── about/                     # 大事记 / 站点说明（按日期多篇）
│   ├── bonus/                     # 彩蛋环节（图文，多篇）
│   ├── credits.md                 # 致谢名单
│   ├── setlist/                   # 各站歌单（<城市>.html）
│   └── lyrics/                    # 歌词 Markdown（chapter1–6 + encore 分目录）
├── img/                  # 图片素材（头像 / 彩蛋 / 日记照片 / 工作人员等）
├── fonts/                # 子集化字体（woff2）
├── lib/                  # 第三方库（ECharts + 中国/世界地图 GeoJSON、marked、灯箱）
├── tools/                # 构建脚本（subset-fonts.js 字体子集化 / gen-report-data.js 生成回忆录数据）
└── docs/                 # 设计文档 + README 截图（docs/screenshots/）
```

## 说明

* 本站为乐迷自制「野生观察站」，非官方站点，仅作资料整理与分享

* 感谢 Lam & Sally、所有工作人员，以及提供素材与帮助的热心网友们

* Design By Michelle Chung © 2025-2026

