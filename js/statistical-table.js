document.addEventListener("DOMContentLoaded", function () {

    fetch('data/json/statistical-table.json')
        .then(res => res.json())
        .then(data => {
            renderDashboard(data);
            renderDetailTable(data);
        });

    function computeTotals(data) {
        const totals = { city: 0, unlock: 0, complete: 0, completeCity: 0 };
        data.forEach(item => {
            totals.city += item.city;
            totals.unlock += item.unlock;
            totals.complete += item.complete;
            totals.completeCity += item.completeCity;
        });
        return totals;
    }

    function renderDashboard(data) {
        const dashboard = document.getElementById('stats-dashboard');
        if (!dashboard) return;

        const totals = computeTotals(data);
        const pending = totals.unlock - totals.complete;

        const cards = [
            { key: 'stats.unlockCity', value: totals.city },
            { key: 'stats.unlockCount', value: totals.unlock },
            { key: 'stats.completeCount', value: totals.complete },
            { key: 'stats.pendingCount', value: pending }
        ];

        dashboard.innerHTML = cards.map(c => `
            <div class="stat-card reveal">
                <div class="num" data-count="${c.value}">0</div>
                <div class="label" data-i18n="${c.key}"></div>
            </div>
        `).join('');

        const pct = totals.unlock > 0 ? Math.round(totals.complete / totals.unlock * 100) : 0;
        const bar = document.querySelector('.progress .bar');
        const label = document.querySelector('[data-progress-label]');

        const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (!en.isIntersecting) return;
                en.target.classList.add('in');
                en.target.querySelectorAll('.num[data-count]').forEach(runCounter);
                io.unobserve(en.target);
            });
        }, { threshold: 0.2 });
        dashboard.querySelectorAll('.stat-card').forEach(el => io.observe(el));

        const progressWrap = document.querySelector('.progress-wrap');
        if (progressWrap && bar) {
            const pio = new IntersectionObserver(entries => {
                entries.forEach(en => {
                    if (!en.isIntersecting) return;
                    progressWrap.classList.add('in');
                    requestAnimationFrame(() => { bar.style.width = pct + '%'; });
                    if (label) animatePercent(label, pct);
                    pio.unobserve(progressWrap);
                });
            }, { threshold: 0.4 });
            pio.observe(progressWrap);
        }

        i18n.applyTranslations();
    }

    function runCounter(el) {
        if (el.dataset.done) return;
        el.dataset.done = '1';
        const target = +el.dataset.count;
        let start = null;
        function step(ts) {
            if (!start) start = ts;
            const p = Math.min((ts - start) / 900, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function animatePercent(label, pct) {
        let start = null;
        function step(ts) {
            if (!start) start = ts;
            const p = Math.min((ts - start) / 1100, 1);
            label.textContent = Math.round(pct * (1 - Math.pow(1 - p, 3))) + '%';
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function renderDetailTable(data) {
        const tbody = document.getElementById('stats-body');
        if (!tbody) return;
        const totalRow = tbody.querySelector('.total-row');
        const totalCells = tbody.querySelectorAll('.total-row .total-cell');

        const totals = { city: 0, unlock: 0, complete: 0, completeCity: 0 };

        data.forEach(item => {
            const pending = item.unlock - item.complete;
            const pendingCity = item.city - item.completeCity;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-i18n="${item.labelKey}"></td>
                <td><span class="count-val">${item.city}</span></td>
                <td><span class="count-val">${item.unlock}</span></td>
                <td>
                    <span class="count-val">${item.complete}</span>
                    (<span class="count-val">${item.completeCity}</span>)
                </td>
                <td>
                    ${pending} (<span class="count-val">${pendingCity}</span>)
                </td>
            `;
            tbody.insertBefore(tr, totalRow);

            totals.city += item.city;
            totals.unlock += item.unlock;
            totals.complete += item.complete;
            totals.completeCity += item.completeCity;
        });

        const totalPending = totals.unlock - totals.complete;
        const totalPendingCity = totals.city - totals.completeCity;

        totalCells[0].innerText = totals.city;
        totalCells[1].innerText = totals.unlock;
        totalCells[2].innerHTML = `${totals.complete} (${totals.completeCity})`;
        totalCells[3].innerHTML = `${totalPending} (${totalPendingCity})`;

        i18n.applyTranslations();
    }
});
