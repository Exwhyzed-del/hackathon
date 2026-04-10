// ==============================
// 🛡️ DEEPSHIELD UNIFIED CONTENT SCRIPT
// ==============================

// --- State ---
let shieldButton = null;
let overlay = null;
let selectionBox = null;
let isSelecting = false;
let startX = 0;
let startY = 0;

// Set to track processed image URLs to avoid duplicates
const processedImages = new Set();

// --- Observers ---
let intersectionObserver = null;
let mutationObserver = null;

// ==============================
// 🚀 INITIALIZATION
// ==============================
function initUnified() {
    // 1. Initialize News Guard (VeriShield) - Universal
    if (
        location.protocol !== "chrome:" &&
        location.protocol !== "edge:" &&
        location.protocol !== "about:"
    ) {
        createShieldButton();
    }

    // 2. Initialize Real-time Image Analysis (DeepShield) - Universal
    setupImageAnalysis();
}

// ==============================
// 🔍 IMAGE ANALYSIS (DeepShield)
// ==============================
function setupImageAnalysis() {
    // IntersectionObserver to analyze only visible images
    intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (!img.dataset.deepshieldProcessed && img.src) {
                    analyzeImage(img);
                }
            }
        });
    }, {
        root: null,
        rootMargin: '50px', // Start analysis slightly before image enters viewport
        threshold: 0.1
    });

    // MutationObserver to detect newly added images
    mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // ELEMENT_NODE
                    if (node.tagName === 'IMG') {
                        intersectionObserver.observe(node);
                    } else {
                        node.querySelectorAll('img').forEach(img => {
                            intersectionObserver.observe(img);
                        });
                    }
                }
            });
        });
    });

    // Observe existing images
    document.querySelectorAll('img').forEach(img => {
        intersectionObserver.observe(img);
    });

    // Start observing the document body for changes
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// --- Safe Chrome API Wrappers ---
function isContextValid() {
    return !!chrome.runtime?.id;
}

async function safeSendMessage(msg) {
    if (!isContextValid()) return { success: false, error: "Extension context invalidated" };
    return new Promise((resolve) => {
        try {
            chrome.runtime.sendMessage(msg, (res) => {
                if (chrome.runtime.lastError) {
                    console.warn("DeepShield Message Error:", chrome.runtime.lastError.message);
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    resolve(res || { success: true });
                }
            });
        } catch (err) {
            console.error("DeepShield Message Exception:", err);
            resolve({ success: false, error: err.message });
        }
    });
}

async function safeStorageSet(data) {
    if (!isContextValid()) return;
    try {
        await chrome.storage.local.set(data);
    } catch (err) {
        console.warn("DeepShield Storage Set Error:", err);
    }
}

async function safeStorageGet(keys) {
    if (!isContextValid()) return {};
    try {
        return await chrome.storage.local.get(keys);
    } catch (err) {
        console.warn("DeepShield Storage Get Error:", err);
        return {};
    }
}

async function analyzeImage(img) {
    // Ignore small icons and base64 placeholders
    if (img.width < 150 || img.height < 150) return;
    if (!img.src || img.src.startsWith('data:')) return;
    
    // Check if already processed
    if (img.dataset.deepshieldProcessed) return;
    img.dataset.deepshieldProcessed = "true";

    // Show loading state
    const badge = createBadge(img, "ANALYZING", 0, true);

    try {
        // Use background for fetch to avoid CORS and context issues
        const response = await safeSendMessage({ 
            type: "DETECT_IMAGE_API", 
            imageUrl: img.src 
        });

        if (!response?.success) throw new Error(response?.error || "Detection failed");
        
        const data = response.data;
        updateBadge(badge, data.label, data.confidence);
    } catch (err) {
        if (isContextValid()) {
            console.error("DeepShield Analysis Error:", err);
        }
        if (badge) badge.remove(); // Remove badge if analysis fails
    }
}

function createBadge(img, label, confidence, isLoading = false) {
    const parent = img.parentElement;
    if (!parent) return null;

    // Ensure parent is positioned for absolute child
    const computedStyle = window.getComputedStyle(parent);
    if (computedStyle.position === 'static') {
        parent.style.position = 'relative';
    }

    const badge = document.createElement("div");
    badge.className = "deepshield-badge";
    
    // Base styles
    badge.style.position = "absolute";
    badge.style.top = "10px";
    badge.style.right = "10px";
    badge.style.zIndex = "10000";
    badge.style.pointerEvents = "none";
    badge.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    badge.style.opacity = "0";
    badge.style.transform = "translateY(-5px)";

    updateBadge(badge, label, confidence, isLoading);

    parent.appendChild(badge);
    
    // Trigger animation
    requestAnimationFrame(() => {
        badge.style.opacity = "1";
        badge.style.transform = "translateY(0)";
    });

    return badge;
}

function updateBadge(badge, label, confidence, isLoading = false) {
    let color, text, glow, icon;

    if (isLoading) {
        text = "ANALYZING...";
        color = "#38bdf8"; // Sky blue
        glow = "rgba(56,189,248,0.4)";
        icon = "⌛";
    } else {
        if (label === "FAKE") {
            text = "AI GENERATED";
            color = "#ff4d4f"; // Red
            glow = "rgba(255,77,79,0.5)";
            icon = "🤖";
        } else if (label === "FILTERED") {
            text = "FILTERED";
            color = "#fadb14"; // Yellow
            glow = "rgba(250,219,20,0.5)";
            icon = "✨";
        } else {
            text = "REAL";
            color = "#52c41a"; // Green
            glow = "rgba(82,196,26,0.5)";
            icon = "✅";
        }
    }

    badge.innerHTML = `
        <div style="
            backdrop-filter: blur(12px) saturate(180%);
            -webkit-backdrop-filter: blur(12px) saturate(180%);
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid ${color}80;
            border-radius: 8px;
            padding: 6px 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 8px ${glow};
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            color: white;
            white-space: nowrap;
        ">
            <span style="font-size: 14px;">${icon}</span>
            <div style="display: flex; flex-direction: column; line-height: 1.2;">
                <span style="font-size: 10px; font-weight: 800; color: ${color}; letter-spacing: 0.8px; text-transform: uppercase;">${text}</span>
                ${!isLoading ? `<span style="font-size: 9px; color: rgba(255,255,255,0.7); font-weight: 500;">${confidence}% confidence</span>` : ''}
            </div>
        </div>
    `;
}

// ==============================
// 🛡️ NEWS GUARD (DeepShield)
// ==============================
function createShieldButton() {
  if (document.getElementById("deepshield-floating-btn")) return;

  shieldButton = document.createElement("button");
  shieldButton.id = "deepshield-floating-btn";
  shieldButton.innerHTML = "🛡";
  shieldButton.title = "Verify news from screen area";
  shieldButton.addEventListener("click", onShieldClick);

  document.body.appendChild(shieldButton);
}

function onShieldClick(e) {
  e.preventDefault();
  e.stopPropagation();
  startScreenSelection();
  safeSendMessage({ type: "OPEN_SIDE_PANEL" });
}

function startScreenSelection() {
  cleanupSelection();
  overlay = document.createElement("div");
  overlay.id = "deepshield-overlay";
  selectionBox = document.createElement("div");
  selectionBox.id = "deepshield-selection-box";
  overlay.appendChild(selectionBox);
  document.documentElement.appendChild(overlay);
  overlay.addEventListener("mousedown", onMouseDown, true);
  overlay.addEventListener("mousemove", onMouseMove, true);
  overlay.addEventListener("mouseup", onMouseUp, true);
  document.addEventListener("keydown", onEscapeClose, true);
}

function cleanupSelection() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  selectionBox = null;
  isSelecting = false;
  document.removeEventListener("keydown", onEscapeClose, true);
}

function onEscapeClose(e) {
  if (e.key === "Escape") cleanupSelection();
}

function onMouseDown(e) {
  e.preventDefault();
  e.stopPropagation();
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;
  updateSelectionBox(startX, startY, 0, 0);
}

function onMouseMove(e) {
  if (!isSelecting) return;
  e.preventDefault();
  e.stopPropagation();
  const currentX = e.clientX;
  const currentY = e.clientY;
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  updateSelectionBox(x, y, width, height);
}

async function onMouseUp(e) {
  if (!isSelecting) return;
  e.preventDefault();
  e.stopPropagation();
  isSelecting = false;
  const endX = e.clientX;
  const endY = e.clientY;
  const rect = {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY)
  };

  if (rect.width < 20 || rect.height < 20) {
    cleanupSelection();
    return;
  }

  try {
    await safeStorageSet({
      deepshield_result: {
        verdict: { status: "PROCESSING", label: "Processing screenshot...", color: "orange" },
        input: "",
        totalMatches: 0,
        uniqueSourceCount: 0,
        uniqueSources: [],
        sources: []
      }
    });
    await safeSendMessage({ type: "RESULT_READY" });

    let extractedText = extractTextFromDOM(rect);
    extractedText = cleanExtractedText(extractedText);
    extractedText = trimForVerification(extractedText);

    if (!extractedText || extractedText.length < 25) {
      const capture = await safeSendMessage({ type: "CAPTURE_VISIBLE_TAB" });
      if (!capture?.success) throw new Error(capture?.error || "Screenshot capture failed");
      const croppedDataUrl = await cropScreenshot(capture.dataUrl, rect);
      const ocrResponse = await safeSendMessage({ type: "OCR_IMAGE", imageDataUrl: croppedDataUrl });
      if (!ocrResponse?.success) throw new Error(ocrResponse?.error || "OCR failed");
      extractedText = cleanExtractedText(String(ocrResponse.text || ""));
      extractedText = trimForVerification(extractedText);
    }

    if (!extractedText || extractedText.length < 20) throw new Error("No readable text found in selected area");

    await safeStorageSet({
      deepshield_last_extracted_text: extractedText,
      deepshield_auto_verify: true
    });
    await safeSendMessage({ type: "SCREENSHOT_TEXT_READY", text: extractedText });
    
    // Auto-click verification if the side panel is already open or will be opened
    await safeSendMessage({ type: "RESULT_READY" });
  } catch (error) {
    if (isContextValid()) {
      console.error("DeepShield Selection Error:", error);
      await safeStorageSet({
        deepshield_result: {
          verdict: { status: "ERROR", label: "Screenshot processing failed", color: "red" },
          input: "",
          totalMatches: 0,
          uniqueSourceCount: 0,
          uniqueSources: [],
          sources: [],
          error: error.message || "Unknown error"
        }
      });
      await safeSendMessage({ type: "RESULT_READY" });
    }
  } finally {
    cleanupSelection();
  }
}

function updateSelectionBox(x, y, width, height) {
  if (!selectionBox) return;
  selectionBox.style.left = `${x}px`;
  selectionBox.style.top = `${y}px`;
  selectionBox.style.width = `${width}px`;
  selectionBox.style.height = `${height}px`;
}

function extractTextFromDOM(rect) {
  const elements = document.querySelectorAll("p, h1, h2, h3, h4, h5, h6, span, div, li, article");
  let text = "";
  elements.forEach(el => {
    const elRect = el.getBoundingClientRect();
    if (
      elRect.top >= rect.y &&
      elRect.left >= rect.x &&
      elRect.bottom <= rect.y + rect.height &&
      elRect.right <= rect.x + rect.width
    ) {
      text += el.innerText + " ";
    }
  });
  return text;
}

function cleanExtractedText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s:/.,'"-]/gu, " ")
    .trim();
}

function trimForVerification(text) {
  if (!text) return "";
  if (text.length > 1000) return text.slice(0, 1000);
  return text;
}

async function cropScreenshot(dataUrl, rect) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(
        img,
        rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr,
        0, 0, rect.width * dpr, rect.height * dpr
      );
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = dataUrl;
  });
}

function sendMessageAsync(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => resolve(res));
  });
}

// Initialize the unified script
initUnified();
