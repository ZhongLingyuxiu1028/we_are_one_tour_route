document.addEventListener("DOMContentLoaded", function () {
    const rows = document.querySelectorAll('.tour-stats tbody tr:not(.total-row)');
    const totalCells = document.querySelectorAll('.tour-stats .total-row .total-cell');

    let totals = {
        city: 0,           // 解锁城市
        unlock: 0,         // 解锁场次
        complete: 0,       // 完成场次
        completeCity: 0    // 完成城市（括号）
    };

    rows.forEach(row => {
        const vals = row.querySelectorAll('.count-val');

        // 按你当前结构固定顺序取值
        let city = parseInt(vals[0].innerText) || 0;
        let unlock = parseInt(vals[1].innerText) || 0;
        let complete = parseInt(vals[2].innerText) || 0;
        let completeCity = parseInt(vals[3].innerText) || 0;

        // 👉 计算“待完成”
        let pending = unlock - complete;
        let pendingCity = city - completeCity;

        // 👉 写回当前行（覆盖原本写死的值）
        let pendingCell = row.children[4];
        pendingCell.innerHTML = `${pending} (<span class="count-val">${pendingCity}</span>)`;

        // 👉 累加 totals
        totals.city += city;
        totals.unlock += unlock;
        totals.complete += complete;
        totals.completeCity += completeCity;
    });

    // 👉 计算合计的“待完成”
    let totalPending = totals.unlock - totals.complete;
    let totalPendingCity = totals.city - totals.completeCity;

    // 👉 填充合计行
    totalCells[0].innerText = totals.city;
    totalCells[1].innerText = totals.unlock;
    totalCells[2].innerHTML = `${totals.complete} (${totals.completeCity})`;
    totalCells[3].innerHTML = `${totalPending} (${totalPendingCity})`;
});