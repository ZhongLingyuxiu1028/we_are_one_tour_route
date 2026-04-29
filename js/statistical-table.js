document.addEventListener("DOMContentLoaded", function () {

    fetch('data/json/statistical-table.json')
        .then(res => res.json())
        .then(data => {
            renderTable(data);
        });

    function renderTable(data) {
        const tbody = document.getElementById('stats-body');
        const totalRow = document.querySelector('.total-row');
        const totalCells = document.querySelectorAll('.total-row .total-cell');

        let totals = {
            city: 0,           // 解锁城市
            unlock: 0,         // 解锁场次
            complete: 0,       // 完成场次
            completeCity: 0    // 完成城市（括号）
        };

        data.forEach(item => {

            let pending = item.unlock - item.complete;
            let pendingCity = item.city - item.completeCity;

            // 👉 构建行
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <!-- 区域 -->
                <td data-i18n="${item.labelKey}"></td>
                <!-- 解锁城市 -->
                <td><span class="count-val">${item.city}</span></td>
                <!-- 解锁场次 -->
                <td><span class="count-val">${item.unlock}</span></td>
                <!-- 完成场次（城市） -->
                <td>
                    <span class="count-val">${item.complete}</span>
                    (<span class="count-val">${item.completeCity}</span>)
                </td>
                <!-- 待完成场次（城市） -->
                <td>
                    ${pending} (<span class="count-val">${pendingCity}</span>)
                </td>
            `;

            // 👇 插在合计行前面
            tbody.insertBefore(tr, totalRow);

            // 👉 累加
            totals.city += item.city;
            totals.unlock += item.unlock;
            totals.complete += item.complete;
            totals.completeCity += item.completeCity;
        });

        // 👉 合计计算
        let totalPending = totals.unlock - totals.complete;
        let totalPendingCity = totals.city - totals.completeCity;

        // 👉 填充合计
        totalCells[0].innerText = totals.city;
        totalCells[1].innerText = totals.unlock;
        totalCells[2].innerHTML = `${totals.complete} (${totals.completeCity})`;
        totalCells[3].innerHTML = `${totalPending} (${totalPendingCity})`;

        // ✅ 语言切换后，重新翻译表格
        i18n.applyTranslations();
    }
});