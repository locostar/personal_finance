let currentYear = parseInt(localStorage.getItem('last_visited_year')) || 2026;
let currentMonth = parseInt(localStorage.getItem('last_visited_month')) || (new Date().getMonth() + 1);

let db = JSON.parse(localStorage.getItem('pb_lifetime_v3')) || {};
let investDb = JSON.parse(localStorage.getItem('pb_invest_db')) || {};

function propagateData(year, month) {
    const currentDataStr = JSON.stringify(db[year][month]);
    const currentInvestStr = JSON.stringify(investDb[year][month]);
    for (let m = month + 1; m <= 12; m++) {
        db[year][m] = JSON.parse(currentDataStr);
        investDb[year][m] = JSON.parse(currentInvestStr);
    }
    let nextYear = year + 1;
    if (db[nextYear]) {
        for (let m = 1; m <= 12; m++) {
            db[nextYear][m] = JSON.parse(currentDataStr);
            investDb[nextYear][m] = JSON.parse(currentInvestStr);
        }
    }
}

function saveData() {
    localStorage.setItem('pb_lifetime_v3', JSON.stringify(db));
    localStorage.setItem('pb_invest_db', JSON.stringify(investDb));
    localStorage.setItem('last_visited_year', currentYear);
    localStorage.setItem('last_visited_month', currentMonth);
    updateSummaryDisplay();
}

function init() {
    renderYearOptions();
    checkAndInitData(currentYear, currentMonth);
    renderMonths();
    renderData();
}

function renderYearOptions() {
    const sel = document.getElementById('year_selector');
    sel.innerHTML = '';
    for(let y = 2026; y <= 2046; y++) {
        const opt = document.createElement('option');
        opt.value = y; opt.innerText = y + "년";
        if(y === currentYear) opt.selected = true;
        sel.appendChild(opt);
    }
}

function checkAndInitData(year, month) {
    if (!db[year]) db[year] = {};
    if (!db[year][month]) {
        db[year][month] = [
            { id: Date.now(), name: "수입", items: [{name: "기본급", detail: "급여", val: "5,000,000"}]},
            { id: Date.now()+1, name: "지출", items: [{name: "생활비", detail: "카드값", val: "2,000,000"}]}
        ];
    }
    if (!investDb[year]) investDb[year] = {};
    if (!investDb[year][month]) {
        investDb[year][month] = [{ name: "새 투자처", type: "계좌종류", buy: 0, total_buy: 0, val: 0 }];
    }
}

function changeYear(year) {
    currentYear = parseInt(year);
    localStorage.setItem('last_visited_year', currentYear);
    checkAndInitData(currentYear, currentMonth);
    renderMonths();
    renderData();
}

function renderMonths() {
    const container = document.getElementById('month_selector');
    container.innerHTML = '';
    for(let i=1; i<=12; i++) {
        const btn = document.createElement('button');
        btn.className = `month-btn px-3 py-2 rounded-lg text-sm font-bold border transition-all ${currentMonth === i ? 'active' : 'bg-white text-slate-500 border-slate-200'}`;
        btn.innerText = `${i}월`;
        btn.onclick = () => { 
            currentMonth = i; 
            localStorage.setItem('last_visited_month', currentMonth);
            checkAndInitData(currentYear, currentMonth); 
            renderMonths();
            renderData(); 
        };
        container.appendChild(btn);
    }
    document.getElementById('current_date_label').innerText = `${currentYear}년 ${currentMonth}월 내역`;
    const annualReport = document.getElementById('annual_report_section');
    if (currentMonth === 12) {
        annualReport.classList.remove('hidden');
        document.getElementById('annual_year_label').innerText = `${currentYear} ANNUAL PERFORMANCE`;
    } else {
        annualReport.classList.add('hidden');
    }
}

function renderData() {
    const container = document.getElementById('category_container');
    container.innerHTML = '';
    db[currentYear][currentMonth].forEach((cat, cIdx) => {
        const catSum = cat.items.reduce((a, b) => a + (parseInt(b.val.replace(/,/g, "")) || 0), 0);
        const catDiv = document.createElement('div');
        catDiv.className = "card p-6 border-l-4 border-slate-800";
        catDiv.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <div class="flex items-center gap-3">
                    <input type="text" class="text-xl font-black text-slate-800 bg-transparent focus:bg-slate-50 rounded w-24 sm:w-auto" value="${cat.name}" onchange="updateDB(${cIdx}, 'name', this.value)">
                    <span id="cat_total_${cIdx}" class="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded whitespace-nowrap">₩${catSum.toLocaleString()}</span>
                </div>
                <div class="flex gap-2">
                    <button onclick="addItem(${cIdx})" class="text-xs font-bold text-slate-500 hover:text-blue-600 border px-2 py-1 rounded whitespace-nowrap">+ 항목</button>
                    <button onclick="removeCategory(${cIdx})" class="text-xs text-slate-300 hover:text-red-500">삭제</button>
                </div>
            </div>
            <div class="category-table-container">
                <table class="w-full">
                    <tbody id="items_${cIdx}" class="sortable-list">
                        ${cat.items.map((item, iIdx) => `
                            <tr class="item-row border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition" data-id="${iIdx}">
                                <td class="handle text-slate-300">⠿</td>
                                <td><input type="text" class="input-plain font-bold text-slate-700" value="${item.name}" onchange="updateItemName(${cIdx}, ${iIdx}, this.value)"></td>
                                <td><input type="text" class="input-plain text-slate-400 text-xs" value="${item.detail}" onchange="updateItemDetail(${cIdx}, ${iIdx}, this.value)"></td>
                                <td><input type="text" class="input-plain text-right font-black text-slate-900" value="${item.val}" onkeyup="formatVal(this); updateItemValRealtime(${cIdx}, ${iIdx}, this.value)"></td>
                                <td class="text-right"><button onclick="removeItem(${cIdx}, ${iIdx})" class="text-slate-200 hover:text-red-500">×</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(catDiv);
        
        new Sortable(catDiv.querySelector('.sortable-list'), {
            handle: '.handle',
            animation: 150,
            onEnd: (evt) => {
                const items = db[currentYear][currentMonth][cIdx].items;
                const movedItem = items.splice(evt.oldIndex, 1)[0];
                items.splice(evt.newIndex, 0, movedItem);
                propagateData(currentYear, currentMonth);
                saveData();
                renderData();
            }
        });
    });
    renderInvestTable();
    updateSummaryDisplay();
}

function renderInvestTable() {
    const body = document.getElementById('invest_table_body');
    body.innerHTML = '';
    const data = investDb[currentYear][currentMonth];
    data.forEach((item, idx) => {
        const buyNum = item.buy || 0;
        const totalBuyNum = item.total_buy || 0;
        const valNum = item.val || 0;
        const profit = valNum - totalBuyNum;
        const pct = totalBuyNum !== 0 ? ((profit / totalBuyNum) * 100).toFixed(1) : "0.0";
        const colorClass = profit > 0 ? "text-red-500" : (profit < 0 ? "text-blue-500" : "text-slate-400");
        
        body.innerHTML += `
            <tr class="item-row border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition">
                <td class="w-8 text-slate-200 text-[10px] text-center"><button onclick="removeInvestRow(${idx})" class="hover:text-red-500">×</button></td>
                <td class="w-1/4 px-2"><input type="text" class="input-plain font-bold text-slate-700" value="${item.name || ''}" onchange="updateInvestField(${idx}, 'name', this.value)"></td>
                <td class="px-2"><input type="text" class="input-plain text-slate-500 text-sm" value="${item.type || ''}" onchange="updateInvestField(${idx}, 'type', this.value)"></td>
                <td class="px-2"><input type="text" class="input-plain text-right font-black text-slate-900" value="${buyNum.toLocaleString()}" onkeyup="updateInvestNumericField(${idx}, 'buy', this)"></td>
                <td class="px-2"><input type="text" class="input-plain text-right font-black text-blue-600" value="${totalBuyNum.toLocaleString()}" onkeyup="updateInvestNumericField(${idx}, 'total_buy', this)"></td>
                <td class="px-2"><input type="text" class="input-plain text-right font-black text-slate-900" value="${valNum.toLocaleString()}" onkeyup="updateInvestNumericField(${idx}, 'val', this)"></td>
                <td class="text-right font-black ${colorClass} w-20 px-2" id="invest_pct_${idx}">${pct}%</td>
            </tr>
        `;
    });
    refreshInvestSummaryOnly();
}

function updateItemValRealtime(cIdx, iIdx, val) {
    db[currentYear][currentMonth][cIdx].items[iIdx].val = val;
    const catSum = db[currentYear][currentMonth][cIdx].items.reduce((a, b) => a + (parseInt(b.val.replace(/,/g, "")) || 0), 0);
    document.getElementById(`cat_total_${cIdx}`).innerText = `₩${catSum.toLocaleString()}`;
    propagateData(currentYear, currentMonth);
    saveData();
}

function updateItemName(cIdx, iIdx, val) {
    db[currentYear][currentMonth][cIdx].items[iIdx].name = val;
    propagateData(currentYear, currentMonth);
    saveData();
}

function updateItemDetail(cIdx, iIdx, val) {
    db[currentYear][currentMonth][cIdx].items[iIdx].detail = val;
    propagateData(currentYear, currentMonth);
    saveData();
}

function updateInvestNumericField(idx, field, el) {
    let rawValue = el.value.replace(/,/g, "");
    let num = parseInt(rawValue) || 0;
    investDb[currentYear][currentMonth][idx][field] = num;
    el.value = num.toLocaleString();
    const item = investDb[currentYear][currentMonth][idx];
    const profit = item.val - (item.total_buy || 0);
    const pct = (item.total_buy && item.total_buy !== 0) ? ((profit / item.total_buy) * 100).toFixed(1) : "0.0";
    const pctEl = document.getElementById(`invest_pct_${idx}`);
    if(pctEl) {
        pctEl.innerText = pct + "%";
        pctEl.className = `text-right font-black px-4 w-20 ${profit > 0 ? 'text-red-500' : (profit < 0 ? 'text-blue-500' : 'text-slate-400')}`;
    }
    refreshInvestSummaryOnly();
    propagateData(currentYear, currentMonth);
    saveData();
}

function refreshInvestSummaryOnly() {
    const data = investDb[currentYear][currentMonth];
    let tBuy = 0, tTotalBuy = 0, tVal = 0;
    data.forEach(item => { 
        tBuy += (item.buy || 0); 
        tTotalBuy += (item.total_buy || 0);
        tVal += (item.val || 0); 
    });
    const totalProfit = tVal - tTotalBuy;
    const totalPct = tTotalBuy !== 0 ? ((totalProfit / tTotalBuy) * 100).toFixed(1) : "0.0";
    document.getElementById('invest_total_badge').innerText = "₩" + tBuy.toLocaleString();
    document.getElementById('invest_total_pct_label').innerText = totalPct + '%';
    document.getElementById('invest_total_pct_label').className = `text-xs font-black ${totalProfit >= 0 ? 'text-red-500' : 'text-blue-500'}`;
    if (currentMonth === 12) {
        const annualEl = document.getElementById('annual_total_pct');
        annualEl.innerText = (totalProfit >= 0 ? '+' : '') + totalPct + '%';
        annualEl.className = `text-5xl md:text-7xl font-black tracking-tighter ${totalProfit >= 0 ? 'text-red-400' : 'text-blue-400'}`;
        document.getElementById('annual_total_buy').innerText = "₩" + tTotalBuy.toLocaleString();
        document.getElementById('annual_total_val').innerText = "₩" + tVal.toLocaleString();
    }
}

function updateSummaryDisplay() {
    let summaryItems = [], totalUsage = 0, incomeTotal = 0;
    db[currentYear][currentMonth].forEach(cat => {
        const catSum = cat.items.reduce((a, b) => a + (parseInt(b.val.replace(/,/g, "")) || 0), 0);
        if (cat.name === "수입") {
            incomeTotal = catSum;
        } else {
            cat.items.forEach(item => {
                let val = parseInt(item.val.replace(/,/g, "")) || 0;
                if (val > 0) { summaryItems.push({name: item.name, value: val, type: 'expense'}); totalUsage += val; }
            });
        }
    });
    const iData = investDb[currentYear][currentMonth];
    if (Array.isArray(iData)) {
        iData.forEach(item => {
            let val = item.buy || 0;
            if (val > 0) { summaryItems.push({name: item.name, value: val, type: 'invest'}); totalUsage += val; }
        });
    }

    let remains = incomeTotal - totalUsage;
    
    // 실시간 잔여금 카드 업데이트
    const remainsValEl = document.getElementById('realtime_remains_val');
    remainsValEl.innerText = "₩" + remains.toLocaleString();
    remainsValEl.className = `text-3xl font-black ${remains >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;

    if (remains > 0) {
        summaryItems.push({name: "잔여금", value: remains, type: 'remain'});
    }

    // 높은 퍼센트(금액) 순으로 정렬
    summaryItems.sort((a, b) => b.value - a.value);

    const container = document.getElementById('stat_summary');
    container.innerHTML = summaryItems.map(item => {
        // Allocation에서는 양수일 때만 표시 (전체 비중 계산을 위해 totalUsage 조정)
        const denom = Math.max(incomeTotal, totalUsage + (remains > 0 ? 0 : 0));
        const p = denom > 0 ? ((item.value/denom)*100).toFixed(1) : 0;
        let barColor = "bg-blue-600";
        if(item.type === 'remain') barColor = "bg-emerald-500";
        if(item.type === 'invest') barColor = "bg-indigo-500";
        
        return `
                <div class="space-y-1">
                    <div class="flex justify-between items-end">
                        <span class="text-slate-600 font-bold text-lg">${item.name}</span>
                        <span class="text-slate-900 font-black text-xl">${p}%</span>
                    </div>
                    <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div class="${barColor} h-full" style="width: ${p}%"></div>
                    </div>
                </div>`;
    }).join('');
}

function formatVal(el) {
    let v = el.value.replace(/\D/g, "");
    el.value = v.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function updateDB(cIdx, field, val) { db[currentYear][currentMonth][cIdx][field] = val; propagateData(currentYear, currentMonth); saveData(); renderData(); }
function addMainCategory() { db[currentYear][currentMonth].push({id: Date.now(), name: "새 분류", items: []}); propagateData(currentYear, currentMonth); saveData(); renderData(); }
function addItem(cIdx) { db[currentYear][currentMonth][cIdx].items.push({name: "새 항목", detail: "", val: "0"}); propagateData(currentYear, currentMonth); saveData(); renderData(); }
function addInvestRow() { investDb[currentYear][currentMonth].push({ name: "새 투자처", type: "계좌종류", buy: 0, total_buy: 0, val: 0 }); propagateData(currentYear, currentMonth); saveData(); renderData(); }
function removeItem(cIdx, iIdx) { db[currentYear][currentMonth][cIdx].items.splice(iIdx, 1); propagateData(currentYear, currentMonth); saveData(); renderData(); }
function removeInvestRow(idx) { if(confirm('삭제하시겠습니까?')) { investDb[currentYear][currentMonth].splice(idx, 1); propagateData(currentYear, currentMonth); saveData(); renderData(); } }
function removeCategory(cIdx) { if(confirm('삭제하시겠습니까?')) { db[currentYear][currentMonth].splice(cIdx, 1); propagateData(currentYear, currentMonth); saveData(); renderData(); } }
function updateInvestField(idx, field, val) { investDb[currentYear][currentMonth][idx][field] = val; propagateData(currentYear, currentMonth); saveData(); updateSummaryDisplay(); }

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ asset: db, invest: investDb }));
    const dlAnchor = document.createElement('a'); dlAnchor.setAttribute("href", dataStr); dlAnchor.setAttribute("download", `PB_BACKUP.json`); dlAnchor.click(); dlAnchor.remove();
}

function importData() {
    const input = document.createElement('input'); input.type = 'file';
    input.onchange = e => {
        const reader = new FileReader();
        reader.onload = re => { 
            const imported = JSON.parse(re.target.result); 
            db = imported.asset; 
            investDb = imported.invest; 
            saveData(); 
            renderData(); 
        }
        reader.readAsText(e.target.files[0]);
    }
    input.click();
}

init();