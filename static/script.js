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
    document.getElementById('extensionModal').classList.toggle('hidden');
}

// NEWS GUARD ACTIONS
function verifyNewsAction() {
    const input = document.getElementById("newsTextInput");
    const btn = document.getElementById("verifyNewsBtn");
    const result = document.getElementById("newsResult");
    
    const text = input.value.trim();
    if (!text) {
        alert("Please enter some news text or a URL first.");
        return;
    }

    btn.innerText = "Verifying coverage...";
    btn.disabled = true;
    result.classList.remove('hidden');
    result.innerHTML = "<p style='color: var(--primary);'>Cross-referencing with global news databases...</p>";

    fetch("/analyze-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    })
    .then(res => res.json())
    .then(data => {
        btn.innerText = "Verify Authenticity";
        btn.disabled = false;
        
        if (data.success) {
            renderNewsResult(data.result);
        } else {
            result.innerHTML = `<p style='color: #ef4444;'>Error: ${data.error}</p>`;
        }
    })
    .catch(err => {
        btn.innerText = "Verify Authenticity";
        btn.disabled = false;
        result.innerHTML = `<p style='color: #ef4444;'>Failed to connect to verification server.</p>`;
        console.error(err);
    });
}

function renderNewsResult(result) {
    const newsResult = document.getElementById("newsResult");
    const verdict = result.verdict;
    const color = verdict.color === 'red' ? '#ef4444' : (verdict.color === 'orange' ? '#f59e0b' : '#10b981');
    
    const publishers = result.uniqueSources.slice(0, 8).join(", ") || "No specific major publishers found";
    
    const links = result.sources.map(s => `
        <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <a href="${s.url}" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 500; display: block; margin-bottom: 4px;">
                ${s.title}
            </a>
            <div style="font-size: 12px; color: var(--text-muted);">
                ${s.source || s.domain} ${s.publishedAt ? '• ' + s.publishedAt : ''}
            </div>
        </div>
    `).join("");

    newsResult.innerHTML = `
        <div style="padding: 24px; border-radius: 12px; border: 2px solid ${color}; background: rgba(255,255,255,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: ${color};">${verdict.label}</h3>
                <div style="font-size: 14px; color: var(--text-muted);">${result.analyzedFromUrl ? 'URL analyzed' : 'Text analyzed'}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                <div style="padding: 16px; border-radius: 8px; background: rgba(255,255,255,0.05);">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Trusted Sources</div>
                    <div style="font-size: 24px; font-weight: 800;">${result.uniqueSourceCount}</div>
                </div>
                <div style="padding: 16px; border-radius: 8px; background: rgba(255,255,255,0.05);">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Search Matches</div>
                    <div style="font-size: 24px; font-weight: 800;">${result.totalMatches}</div>
                </div>
            </div>

            <div style="margin-bottom: 24px;">
                <h5 style="margin: 0 0 8px 0; color: var(--text-muted); text-transform: uppercase; font-size: 11px;">Major Coverage</h5>
                <p style="margin: 0; font-size: 14px;">${publishers}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <h5 style="margin: 0 0 12px 0; color: var(--text-muted); text-transform: uppercase; font-size: 11px;">Verification Links</h5>
                <div style="max-height: 300px; overflow-y: auto; padding-right: 8px;">
                    ${links || '<p style="font-size: 14px; color: var(--text-muted);">No direct coverage links found.</p>'}
                </div>
            </div>
        </div>
    `;
}

function clearNews() {
    document.getElementById("newsTextInput").value = "";
    document.getElementById("newsResult").classList.add('hidden');
}

// Start chart on load
window.onload = updateChart;
