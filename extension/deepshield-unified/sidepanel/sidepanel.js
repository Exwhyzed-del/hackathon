const newsInput = document.getElementById("newsInput");
const verifyBtn = document.getElementById("verifyBtn");
const clearBtn = document.getElementById("clearBtn");
const resultDiv = document.getElementById("result");

document.addEventListener("DOMContentLoaded", async () => {
  const session = await chrome.storage.local.get([
    "deepshield_result",
    "deepshield_last_extracted_text",
    "deepshield_auto_verify"
  ]);

  if (session.deepshield_last_extracted_text) {
    newsInput.value = session.deepshield_last_extracted_text;
  }

  if (session.deepshield_result) {
    renderResult(session.deepshield_result);
  }

  if (session.deepshield_auto_verify && newsInput.value.trim()) {
    await chrome.storage.local.remove("deepshield_auto_verify");
    runVerification(newsInput.value.trim());
  }
});

verifyBtn.addEventListener("click", async () => {
  const text = newsInput.value.trim();

  if (!text) {
    renderMessage("Please paste some news text or URL first.");
    return;
  }

  runVerification(text);
});

clearBtn.addEventListener("click", async () => {
  newsInput.value = "";
  resultDiv.innerHTML = "";
  resultDiv.classList.add("hidden");

  await chrome.storage.local.remove([
    "deepshield_result",
    "deepshield_last_extracted_text",
    "deepshield_auto_verify"
  ]);
});

window.addEventListener("unload", async () => {
  await chrome.storage.local.remove([
    "deepshield_result",
    "deepshield_last_extracted_text",
    "deepshield_auto_verify"
  ]);
});

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === "RESULT_READY") {
    const session = await chrome.storage.local.get([
      "deepshield_result",
      "deepshield_last_extracted_text",
      "deepshield_auto_verify"
    ]);

    if (session.deepshield_last_extracted_text) {
      newsInput.value = session.deepshield_last_extracted_text;
    }

    if (session.deepshield_result) {
      renderResult(session.deepshield_result);
    }

    // Auto-verify if flagged
    if (session.deepshield_auto_verify && newsInput.value.trim()) {
      await chrome.storage.local.remove("deepshield_auto_verify");
      runVerification(newsInput.value.trim());
    }
  }

  if (message.type === "SCREENSHOT_TEXT_READY") {
    const text = String(message.text || "").trim();

    if (text) {
      newsInput.value = text;
      await chrome.storage.local.set({
        deepshield_last_extracted_text: text
      });
      runVerification(text);
    }
  }
});

async function runVerification(text) {
  renderMessage("Searching trusted news coverage...");

  chrome.runtime.sendMessage(
    {
      type: "VERIFY_NEWS",
      text
    },
    async (response) => {
      if (chrome.runtime.lastError) {
        renderMessage(chrome.runtime.lastError.message || "Verification failed");
        return;
      }

      if (!response?.success) {
        renderMessage(response?.error || "Verification failed");
        return;
      }

      await chrome.storage.local.set({
        deepshield_result: response.result
      });

      renderResult(response.result);
    }
  );
}

function renderMessage(message) {
  resultDiv.classList.remove("hidden");
  resultDiv.innerHTML = `<div class="meta">${escapeHtml(message)}</div>`;
}

function renderResult(result) {
  resultDiv.classList.remove("hidden");

  const verdict = result.verdict || {
    label: "Unknown",
    color: "orange"
  };

  const publishers = Array.isArray(result.uniqueSources)
    ? result.uniqueSources.slice(0, 10)
    : [];

  const trustedCount = result.uniqueSourceCount || 0;
  const suspiciousLabel = verdict.label || "Unknown";

  const sourceCards = (result.sources || []).length
    ? result.sources.map(source => {
        const sourceName = source.source || source.domain || "Unknown source";
        return `
          <div class="source-card">
            <a class="source-title" href="${source.url}" target="_blank">
              ${escapeHtml(source.title || source.url)}
            </a>
            <div class="source-meta">
              ${escapeHtml(sourceName)}
              ${source.publishedAt ? " • " + escapeHtml(source.publishedAt) : ""}
            </div>
          </div>
        `;
      }).join("")
    : `<div class="meta">No trusted news links found.</div>`;

  const analyzedType = result.analyzedFromUrl ? "URL analyzed" : "Text analyzed";

  resultDiv.innerHTML = `
    <div class="result-header">
      <div class="badge ${verdict.color}">${escapeHtml(suspiciousLabel)}</div>
      <div class="result-type">${escapeHtml(analyzedType)}</div>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">Trusted websites</div>
        <div class="stat-value">${trustedCount}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Links found</div>
        <div class="stat-value">${result.totalMatches || 0}</div>
      </div>
    </div>

    <div class="meta"><strong>Publishers:</strong> ${publishers.length ? publishers.map(escapeHtml).join(", ") : "None"}</div>

    <details class="details-box">
      <summary>Show analyzed content</summary>
      <div class="meta">${escapeHtml((result.input || "").slice(0, 700))}</div>
    </details>

    <div class="section-title">Trusted related news links</div>
    <div class="source-list-clean">
      ${sourceCards}
    </div>

    ${result.error ? `<div class="meta error"><strong>Error:</strong> ${escapeHtml(result.error)}</div>` : ""}
  `;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}