/* =============================
   貯蓄シミュレーター script.js
   ============================= */

const COLOR_PRINCIPAL = '#2A9D8F';
const COLOR_GAIN      = '#E76F51';
const COLOR_GRID      = '#e8e8e8';
const COLOR_TEXT      = '#666666';

/* ----- プレビュー表示 ----- */
function updatePreview(inputId, previewId) {
    const val = parseFloat(document.getElementById(inputId).value);
    const el  = document.getElementById(previewId);
    if (isNaN(val) || val < 0) {
        el.textContent = '';
        return;
    }
    const yen = Math.round(val * 10000);
    el.textContent = '→ ' + yen.toLocaleString('ja-JP') + ' 円';
}

/* ----- スライダー変更 ----- */
function onSliderChange(sliderId, displayId) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    const v = parseFloat(slider.value);
    if (sliderId === 'rateSlider') {
        display.textContent = v.toFixed(1) + '%';
    } else {
        display.textContent = v + '年';
    }
    updateSliderTrack(slider);
}

function updateSliderTrack(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.background =
        `linear-gradient(to right, #2A9D8F ${pct}%, #e0e0e0 ${pct}%)`;
}

/* ----- 初期化時にスライダートラックを設定 ----- */
document.addEventListener('DOMContentLoaded', () => {
    updateSliderTrack(document.getElementById('rateSlider'));
    updateSliderTrack(document.getElementById('yearsSlider'));
});

/* ----- 計算ロジック ----- */
function calcYearly(initial, monthly, annualRate, years) {
    const r = annualRate / 100 / 12; // 月利
    const data = []; // [{year, total, principal}]

    for (let y = 1; y <= years; y++) {
        const months = y * 12;
        let total;
        if (r === 0) {
            total = initial + monthly * months;
        } else {
            // 初期元本の複利成長
            const grownInitial = initial * Math.pow(1 + r, months);
            // 毎月積立の将来価値（終価年金）
            const grownMonthly = monthly * (Math.pow(1 + r, months) - 1) / r;
            total = grownInitial + grownMonthly;
        }
        const principal = initial + monthly * months;
        data.push({ year: y, total: total, principal: principal });
    }
    return data;
}

/* ----- フォーム送信 ----- */
document.getElementById('simForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const initial  = parseFloat(document.getElementById('initialSavings').value) || 0;
    const monthly  = parseFloat(document.getElementById('monthly').value) || 0;
    const rate     = parseFloat(document.getElementById('rateSlider').value);
    const years    = parseInt(document.getElementById('yearsSlider').value);

    const data      = calcYearly(initial, monthly, rate, years);
    const last      = data[data.length - 1];
    const finalAmt  = Math.round(last.total * 10) / 10;
    const principal = Math.round(last.principal * 10) / 10;
    const gain      = Math.round((last.total - last.principal) * 10) / 10;

    // 結果テキスト表示
    document.getElementById('rFinal').textContent     = fmtMan(finalAmt);
    document.getElementById('rPrincipal').textContent = fmtMan(principal);
    document.getElementById('rGain').textContent      = fmtMan(gain);

    // シェアリンク
    const msg = `【貯蓄シミュレーター】${years}年後の貯蓄額は約${fmtMan(finalAmt)}万円！（元本${fmtMan(principal)}万円＋運用益${fmtMan(gain)}万円）`;
    const url = location.href;
    document.getElementById('shareTwitter').href =
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg + '\n' + url)}`;
    document.getElementById('shareLine').href =
        `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(msg)}`;

    // 結果エリアを先に表示してからグラフ描画（非表示中はoffsetWidth=0になるため）
    const result = document.getElementById('resultContainer');
    result.classList.remove('hidden');

    // グラフ描画
    drawDonut(principal, gain > 0 ? gain : 0);
    drawLine(data);

    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ----- 数値フォーマット ----- */
function fmtMan(v) {
    if (v >= 10000) {
        return (Math.round(v / 10) / 100).toLocaleString('ja-JP', { maximumFractionDigits: 1 }) + '億';
    }
    return v.toLocaleString('ja-JP', { maximumFractionDigits: 1 });
}

/* =============================
   ドーナツグラフ（Canvas API）
   ============================= */
function drawDonut(principal, gain) {
    const canvas = document.getElementById('donutChart');
    const ctx    = canvas.getContext('2d');

    // 高解像度対応
    const dpr  = window.devicePixelRatio || 2;
    const cssW = canvas.offsetWidth  || 160;
    const cssH = canvas.offsetHeight || 160;
    canvas.width  = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.scale(dpr, dpr);

    const W = cssW;
    const H = cssH;
    ctx.clearRect(0, 0, W, H);

    const total = principal + gain;
    const cx = W / 2;
    const cy = H / 2;
    const outerR = W / 2 - 6;
    const innerR = outerR * 0.56;

    const segments = [
        { value: principal, color: COLOR_PRINCIPAL, label: '元本' },
        { value: gain,      color: COLOR_GAIN,      label: '運用益' }
    ];

    let startAngle = -Math.PI / 2;

    segments.forEach(seg => {
        if (seg.value <= 0) return;
        const sweep = (seg.value / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outerR, startAngle, startAngle + sweep);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();
        startAngle += sweep;
    });

    // 中央くり抜き（白）
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // 中央テキスト
    if (total > 0) {
        ctx.fillStyle = '#333';
        ctx.font = `bold ${Math.round(W * 0.12)}px 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const gainPct = Math.round((gain / total) * 100);
        ctx.fillText(`+${gainPct}%`, cx, cy);
    }

    // 凡例
    const legend = document.getElementById('donutLegend');
    legend.innerHTML = '';
    segments.forEach(seg => {
        if (seg.value < 0) return;
        const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <span class="legend-color" style="background:${seg.color}"></span>
            <span>${seg.label}</span>
            <span class="legend-pct">${pct}%</span>
            <span style="color:#888;font-size:12px;">（${fmtMan(Math.round(seg.value * 10) / 10)}万円）</span>
        `;
        legend.appendChild(item);
    });
}

/* =============================
   折れ線グラフ（Canvas API）
   ============================= */
function drawLine(data) {
    const canvas = document.getElementById('lineChart');
    const ctx    = canvas.getContext('2d');

    // 高解像度対応
    const dpr  = window.devicePixelRatio || 2;
    const cssW = canvas.offsetWidth || 500;
    const cssH = 220;
    canvas.width  = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.scale(dpr, dpr);

    const W = cssW;
    const H = cssH;

    const padL = 58, padR = 16, padT = 16, padB = 36;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    ctx.clearRect(0, 0, W, H);

    const maxVal = Math.max(...data.map(d => d.total));
    const niceMax = niceNumber(maxVal);
    const years   = data.length;

    // Y軸グリッド & ラベル
    const gridLines = 5;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(11 * Math.min(1, W / 400))}px 'Segoe UI', sans-serif`;

    for (let i = 0; i <= gridLines; i++) {
        const v  = (niceMax / gridLines) * i;
        const py = padT + chartH - (v / niceMax) * chartH;

        ctx.strokeStyle = COLOR_GRID;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(padL, py);
        ctx.lineTo(padL + chartW, py);
        ctx.stroke();

        ctx.fillStyle = COLOR_TEXT;
        ctx.fillText(fmtAxisVal(v), padL - 6, py);
    }

    // X軸ラベル（間引き表示）
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = COLOR_TEXT;
    const xStep = years <= 20 ? 5 : 10;
    data.forEach((d, i) => {
        if (d.year % xStep === 0 || d.year === 1) {
            const px = padL + (i / (years - 1)) * chartW;
            ctx.fillText(d.year + '年', px, padT + chartH + 6);
        }
    });

    // 元本エリア塗りつぶし
    ctx.beginPath();
    data.forEach((d, i) => {
        const px = padL + (i / (years - 1)) * chartW;
        const py = padT + chartH - (d.principal / niceMax) * chartH;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    // 下辺
    ctx.lineTo(padL + chartW, padT + chartH);
    ctx.lineTo(padL, padT + chartH);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(COLOR_PRINCIPAL, 0.15);
    ctx.fill();

    // 合計エリア塗りつぶし（元本との差分）
    ctx.beginPath();
    data.forEach((d, i) => {
        const px = padL + (i / (years - 1)) * chartW;
        const py = padT + chartH - (d.total / niceMax) * chartH;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    // 元本ラインを逆順で
    for (let i = data.length - 1; i >= 0; i--) {
        const d  = data[i];
        const px = padL + (i / (years - 1)) * chartW;
        const py = padT + chartH - (d.principal / niceMax) * chartH;
        ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = hexToRgba(COLOR_GAIN, 0.18);
    ctx.fill();

    // 元本ライン
    drawPolyline(ctx, data, 'principal', niceMax, padL, padT, chartW, chartH, COLOR_PRINCIPAL, 1.8);

    // 合計ライン
    drawPolyline(ctx, data, 'total', niceMax, padL, padT, chartW, chartH, COLOR_GAIN, 2.5);

    // 最終値バブル
    if (data.length > 1) {
        drawEndBubble(ctx, data[data.length - 1].total,     niceMax, padL, padT, chartW, chartH, years, COLOR_GAIN);
        drawEndBubble(ctx, data[data.length - 1].principal, niceMax, padL, padT, chartW, chartH, years, COLOR_PRINCIPAL);
    }

    // 凡例
    const legY = padT + 4;
    drawLegendDot(ctx, padL + 10, legY, COLOR_GAIN,      '最終残高');
    drawLegendDot(ctx, padL + 10 + 80, legY, COLOR_PRINCIPAL, '元本');
}

function drawPolyline(ctx, data, key, maxVal, padL, padT, chartW, chartH, color, lw) {
    const years = data.length;
    ctx.beginPath();
    data.forEach((d, i) => {
        const px = padL + (i / (years - 1)) * chartW;
        const py = padT + chartH - (d[key] / maxVal) * chartH;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth   = lw;
    ctx.lineJoin    = 'round';
    ctx.stroke();
}

function drawEndBubble(ctx, value, maxVal, padL, padT, chartW, chartH, years, color) {
    const px = padL + chartW;
    const py = padT + chartH - (value / maxVal) * chartH;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawLegendDot(ctx, x, y, color, label) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#555';
    ctx.font         = '11px Segoe UI, sans-serif';
    ctx.fillText(label, x + 9, y);
}

/* ----- ユーティリティ ----- */
function niceNumber(v) {
    if (v <= 0) return 100;
    const exp  = Math.floor(Math.log10(v));
    const base = Math.pow(10, exp);
    const frac = v / base;
    let nice;
    if      (frac <= 1)  nice = 1;
    else if (frac <= 2)  nice = 2;
    else if (frac <= 2.5) nice = 2.5;
    else if (frac <= 5)  nice = 5;
    else                 nice = 10;
    return nice * base * 1.1;
}

function fmtAxisVal(v) {
    if (v >= 10000) return (v / 10000).toFixed(0) + '億';
    if (v >= 1000)  return (v / 1000).toFixed(0) + '千';
    return Math.round(v) + '';
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

/* ----- モーダル ----- */
function openPrivacyModal() {
    document.getElementById('privacyModal').classList.add('open');
}

function closePrivacyModal() {
    document.getElementById('privacyModal').classList.remove('open');
}

document.getElementById('privacyModal').addEventListener('click', function (e) {
    if (e.target === this) closePrivacyModal();
});
