var fileInput = document.getElementById("fileInput");
var preview = document.getElementById("previewContainer");
var results = document.getElementById("results");

var realCount = 0;
var fakeCount = 0;
var filteredCount = 0;

// OPEN FILE
function openFile() {
    fileInput.click();
}

// HANDLE FILE SELECT
fileInput.addEventListener("change", function () {
    preview.innerHTML = "";
    results.innerHTML = "";

    Array.from(fileInput.files).forEach(file => {
        uploadFile(file);
    });
});

// UPLOAD + ANALYZE
function uploadFile(file) {

    var formData = new FormData();
    formData.append("file", file);

    var imgContainer = document.createElement("div");
    imgContainer.style.position = "relative";
    
    var img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    imgContainer.appendChild(img);
    preview.appendChild(imgContainer);

    fetch("/upload", {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(data => showResult(data))
    .catch(err => console.log(err));
}

// SHOW RESULT
function showResult(data) {

    var label = data.label.toUpperCase();
    var colorClass = data.label.toLowerCase();

    if (colorClass === "real") realCount++;
    if (colorClass === "fake") fakeCount++;
    if (colorClass === "filtered") filteredCount++;

    updateStats();

    var card = document.createElement("div");
    card.className = "result-box " + colorClass;

    card.innerHTML =
        "<div class='badge'>" + label + "</div>" +
        "<div class='progress'>" +
        "<div class='progress-bar' style='width:" + data.confidence + "%'></div>" +
        "</div>" +
        "<div style='font-size: 13px; color: var(--text-muted);'>" + data.confidence + "% confidence</div>";

    results.appendChild(card);

    updateChart();
}

// UPDATE STATS
function updateStats() {
    document.getElementById("realCount").innerText = realCount;
    document.getElementById("fakeCount").innerText = fakeCount;
    document.getElementById("filteredCount").innerText = filteredCount;
}

// CHART
var chart;

function updateChart() {

    var data = {
        labels: ["Real", "Fake", "Filtered"],
        datasets: [{
            data: [realCount, fakeCount, filteredCount],
            backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
            borderWidth: 0,
            borderRadius: 8
        }]
    };

    if (chart) {
        chart.data = data;
        chart.update();
        return;
    }

    chart = new Chart(document.getElementById("chart"), {
        type: "bar",
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

// SECTION SWITCHING
function showSection(sectionId) {
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('newsSection').classList.add('hidden');
    
    // Update sidebar active state
    const items = document.querySelectorAll('.menu .item');
    items.forEach(item => item.classList.remove('active'));
    
    // Find the item that was clicked and set it active
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    if (sectionId === 'dashboard') {
        document.getElementById('dashboardSection').classList.remove('hidden');
    } else if (sectionId === 'news') {
        document.getElementById('newsSection').classList.remove('hidden');
    }
}

// MODAL TOGGLE
function toggleExtensionModal() {
    const modal = document.getElementById('extensionModal');
    modal.classList.toggle('hidden');
}

// NEWS VERIFICATION
function verifyNewsAction() {
    const text = document.getElementById('newsTextInput').value.trim();
    const resultDiv = document.getElementById('newsResult');
    const verifyBtn = document.getElementById('verifyNewsBtn');

    if (!text) {
        return;
    }

    verifyBtn.innerText = "Analyzing Sources...";
    verifyBtn.disabled = true;
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = "<p style='color: var(--primary);'>Cross-referencing global news databases...</p>";

    fetch("/analyze-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text })
    })
    .then(res => res.json())
    .then(data => {
        verifyBtn.innerText = "Verify Authenticity";
        verifyBtn.disabled = false;
        
        if (data.success) {
            renderNewsResult(data.result);
        } else {
            resultDiv.innerHTML = `<p style='color: #ef4444;'>Error: ${data.error}</p>`;
        }
    })
    .catch(err => {
        verifyBtn.innerText = "Verify Authenticity";
        verifyBtn.disabled = false;
        resultDiv.innerHTML = `<p style='color: #ef4444;'>Failed to connect to verification server.</p>`;
        console.error(err);
    });
}

function renderNewsResult(result) {
    const resultDiv = document.getElementById('newsResult');
    const verdict = result.verdict;
    
    let sourcesHtml = result.sources.map(s => `
        <div class="source-item">
            <a href="${s.url}" target="_blank">${s.title}</a>
            <div class="meta">${s.source || s.domain} • ${s.publishedAt || 'Verified Source'}</div>
        </div>
    `).join('');

    if (result.sources.length === 0) {
        sourcesHtml = "<p style='color: var(--text-muted);'>No trusted news coverage found for this specific claim.</p>";
    }

    resultDiv.innerHTML = `
        <div class="news-verdict verdict-${verdict.color}">
            Verdict: ${verdict.label}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div class="card" style="text-align: center; padding: 20px;">
                <div style="font-size: 28px; font-weight: 800; color: var(--primary);">${result.uniqueSourceCount}</div>
                <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Trusted Publishers</div>
            </div>
            <div class="card" style="text-align: center; padding: 20px;">
                <div style="font-size: 28px; font-weight: 800; color: var(--primary);">${result.totalMatches}</div>
                <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Corroborating Links</div>
            </div>
        </div>
        <h4 style="margin-bottom: 16px;">Verified Coverage:</h4>
        <div class="source-list">
            ${sourcesHtml}
        </div>
    `;
}

function clearNews() {
    document.getElementById('newsTextInput').value = "";
    document.getElementById('newsResult').classList.add('hidden');
    document.getElementById('newsResult').innerHTML = "";
}
