chrome.runtime.onInstalled.addListener(() => {
  console.log("DeepShield Unified installed");
  chrome.contextMenus.create({
    id: "verifySelection",
    title: "Verify news credibility",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "verifySelection" && info.selectionText) {
    await chrome.storage.local.set({
      deepshield_last_extracted_text: info.selectionText,
      deepshield_auto_verify: true
    });
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.windowId) return;
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (err) {
    console.warn("Failed to open side panel:", err);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "VERIFY_NEWS") {
    verifyNews(message.text)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => {
        console.error("VERIFY_NEWS error:", error);
        sendResponse({
          success: false,
          error: error.message || "Verification failed"
        });
      });
    return true;
  }

  if (message.type === "CAPTURE_VISIBLE_TAB") {
    chrome.tabs.captureVisibleTab(
      sender.tab?.windowId,
      { format: "png" },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message
          });
          return;
        }
        sendResponse({ success: true, dataUrl });
      }
    );
    return true;
  }

  if (message.type === "OPEN_SIDE_PANEL") {
    if (sender.tab?.windowId) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId })
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }
    sendResponse({ success: false, error: "No active window" });
    return false;
  }

  if (message.type === "OCR_IMAGE") {
    extractTextFromImage(message.imageDataUrl)
      .then((text) => sendResponse({ success: true, text }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === "DETECT_IMAGE_API") {
    detectImage(message.imageUrl)
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === "RESULT_READY" || message.type === "SCREENSHOT_TEXT_READY") {
    // Just a heartbeat/notify message, no complex async work
    sendResponse({ success: true });
    return false;
  }
});

async function detectImage(imageUrl) {
  try {
    const response = await fetch("http://127.0.0.1:5000/detect-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image_url: imageUrl
      })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error("Background Detection Error:", err);
    throw err;
  }
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s:/.,'"-]/gu, " ")
    .trim();
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getDomain(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function cleanGoogleNewsRedirect(rawUrl) {
  try {
    const url = new URL(rawUrl);

    if (url.hostname.includes("news.google.com")) {
      const target = url.searchParams.get("url");
      if (target) return target;
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

function isBlockedDomain(domain) {
  const blocked = [
    "play.google.com",
    "apkpure.com",
    "apkcombo.com",
    "uptodown.com",
    "youtube.com",
    "youtu.be",
    "reddit.com",
    "instagram.com",
    "facebook.com",
    "x.com",
    "twitter.com",
    "tiktok.com",
    "pinterest.com",
    "quora.com",
    "medium.com",
    "linkedin.com",
    "law360.com"
  ];

  return blocked.includes(domain);
}

function isNewsLikeDomain(domain) {
  if (!domain) return false;
  if (isBlockedDomain(domain)) return false;

  const strongNewsDomains = [
    "bbc.com",
    "reuters.com",
    "apnews.com",
    "thehindu.com",
    "ndtv.com",
    "indiatoday.in",
    "indianexpress.com",
    "hindustantimes.com",
    "theprint.in",
    "timesofindia.indiatimes.com",
    "aljazeera.com",
    "cnn.com",
    "nytimes.com",
    "theguardian.com",
    "washingtonpost.com",
    "npr.org",
    "abcnews.go.com",
    "cnbc.com",
    "bloomberg.com",
    "wsj.com",
    "news18.com",
    "firstpost.com",
    "dw.com",
    "france24.com",
    "abc.net.au",
    "cbc.ca",
    "usatoday.com",
    "sky.com",
    "economictimes.indiatimes.com",
    "livemint.com",
    "moneycontrol.com",
    "scroll.in",
    "deccanherald.com",
    "telegraphindia.com",
    "newindianexpress.com",
    "thewire.in"
  ];

  if (strongNewsDomains.some(d => domain === d || domain.endsWith("." + d))) {
    return true;
  }

  const blockedWords = [
    "law",
    "legal",
    "lawsuit",
    "attorney",
    "firm",
    "court",
    "archive",
    "dictionary",
    "wiki",
    "forum",
    "docs",
    "pdf",
    "researchgate",
    "responsibility",
    "committee",
    "center",
    "centre",
    "policy",
    "petition"
  ];

  if (blockedWords.some(word => domain.includes(word))) {
    return false;
  }

  return /(news|times|post|herald|tribune|journal|media|today|express|chronicle|telegraph|standard|mirror|wire|observer|gazette)/i.test(domain);
}

function getSourceIdentity(item) {
  const sourceName = String(item.source || "").trim().toLowerCase();
  if (sourceName) return sourceName;

  const domain = getDomain(item.url || "");

  if (
    domain === "news.google.com" ||
    domain === "google.com" ||
    domain === "duckduckgo.com" ||
    domain === "html.duckduckgo.com"
  ) {
    return "";
  }

  return domain;
}

function extractUrlFromText(text) {
  const match = String(text || "").match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : "";
}

async function fetchArticleTextFromUrl(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return "";

    const html = await response.text();

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescMatch = html.match(
      /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
    );

    const title = titleMatch ? stripHtml(titleMatch[1]) : "";
    const desc = metaDescMatch ? decodeHtmlEntities(metaDescMatch[1]) : "";

    return normalizeText(`${title}. ${desc}`);
  } catch {
    return "";
  }
}

function splitSentences(text) {
  return normalizeText(text)
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildQueries(inputText) {
  const cleaned = normalizeText(inputText);
  const sentences = splitSentences(cleaned);
  const queries = [];

  if (sentences.length > 0) queries.push(sentences[0].slice(0, 140));
  if (sentences.length > 1) queries.push(sentences[1].slice(0, 140));

  const longClauses = cleaned
    .split(/[.!?।]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30)
    .slice(0, 4);

  for (const clause of longClauses) {
    queries.push(clause.slice(0, 160));
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 6) {
    queries.push(words.slice(0, 10).join(" "));
  }

  return [...new Set(queries.map(q => q.trim()).filter(q => q.length >= 15))].slice(0, 6);
}

function scoreResult(result, originalText) {
  const haystack = normalizeText(
    `${result.title || ""} ${result.source || ""} ${result.domain || ""}`
  ).toLowerCase();

  const words = normalizeText(originalText)
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 25);

  let score = 0;
  for (const word of words) {
    if (haystack.includes(word)) score++;
  }

  return score;
}

function classifyBySourceCount(count) {
  if (count === 0) {
    return {
      status: "FAKE",
      label: "Fake / No matching coverage found",
      color: "red"
    };
  }

  if (count < 4) {
    return {
      status: "SUSPICIOUS",
      label: "Suspicious / Very low corroboration",
      color: "orange"
    };
  }

  if (count < 10) {
    return {
      status: "SUSPICIOUS",
      label: "Suspicious / Not enough trusted coverage",
      color: "orange"
    };
  }

  return {
    status: "REAL",
    label: "Likely real / Multiple independent news sources found",
    color: "green"
  };
}

async function searchGoogleNewsRSSOneUrl(rssUrl) {
  const response = await fetch(rssUrl);
  if (!response.ok) {
    throw new Error(`Google News RSS failed: ${response.status}`);
  }

  const xml = await response.text();
  const items = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];

    const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
    const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const sourceMatch = item.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

    const title = decodeHtmlEntities(titleMatch?.[1] || "").trim();
    const rawUrl = decodeHtmlEntities(linkMatch?.[1] || "").trim();
    const url = cleanGoogleNewsRedirect(rawUrl);
    const publishedAt = decodeHtmlEntities(pubDateMatch?.[1] || "").trim();
    const source = decodeHtmlEntities(sourceMatch?.[1] || "").trim();
    const domain = getDomain(url);

    if (title && url && isNewsLikeDomain(domain)) {
      items.push({
        title,
        url,
        source,
        publishedAt,
        domain
      });
    }
  }

  return items;
}

async function searchGoogleNewsRSS(query) {
  const rssUrls = [
    `https://news.google.com/rss/search?q=${encodeURIComponent(query + " when:30d")}&hl=en-IN&gl=IN&ceid=IN:en`,
    `https://news.google.com/rss/search?q=${encodeURIComponent(query + " when:30d")}&hl=hi-IN&gl=IN&ceid=IN:hi`
  ];

  const settled = await Promise.allSettled(
    rssUrls.map((url) => searchGoogleNewsRSSOneUrl(url))
  );

  const combined = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      combined.push(...result.value);
    }
  }

  return combined;
}

async function searchDuckDuckGo(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + " news")}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`DuckDuckGo failed: ${response.status}`);
  }

  const html = await response.text();
  const items = [];

  const anchorRegex = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    const rawUrl = decodeHtmlEntities(match[1]);
    const cleanedUrl = cleanGoogleNewsRedirect(rawUrl);
    const title = stripHtml(match[2]);
    const domain = getDomain(cleanedUrl);

    if (title && cleanedUrl && isNewsLikeDomain(domain)) {
      items.push({
        title,
        url: cleanedUrl,
        source: "",
        publishedAt: "",
        domain
      });
    }
  }

  return items;
}

async function verifyNews(userInput) {
  let text = normalizeText(userInput);
  if (!text) {
    throw new Error("No text provided");
  }

  const possibleUrl = extractUrlFromText(text);
  let analyzedFromUrl = false;

  if (possibleUrl) {
    const articleText = await fetchArticleTextFromUrl(possibleUrl);
    if (articleText) {
      text = articleText;
      analyzedFromUrl = true;
    }
  }

  const queries = buildQueries(text);
  if (queries.length === 0) {
    throw new Error("Could not create search queries");
  }

  const rawResults = [];

  for (const query of queries) {
    const settled = await Promise.allSettled([
      searchGoogleNewsRSS(query),
      searchDuckDuckGo(query)
    ]);

    for (const result of settled) {
      if (result.status === "fulfilled") {
        rawResults.push(...result.value);
      }
    }
  }

  const uniqueByUrl = new Map();

  for (const item of rawResults) {
    const cleanUrl = String(item.url || "").trim();
    if (!cleanUrl) continue;

    const domain = getDomain(cleanUrl);
    if (!isNewsLikeDomain(domain)) continue;

    const score = scoreResult(item, text);

    if (score < 2) continue;

    if (!uniqueByUrl.has(cleanUrl)) {
      uniqueByUrl.set(cleanUrl, {
        ...item,
        domain,
        score
      });
    } else {
      const existing = uniqueByUrl.get(cleanUrl);
      uniqueByUrl.set(cleanUrl, {
        ...existing,
        source: existing.source || item.source,
        publishedAt: existing.publishedAt || item.publishedAt,
        score: Math.max(existing.score, score)
      });
    }
  }

  const deduped = [...uniqueByUrl.values()]
    .filter(item => item.score >= 2)
    .sort((a, b) => b.score - a.score);

  const sourceIdentities = deduped
    .map(item => getSourceIdentity(item))
    .filter(Boolean);

  const uniqueSources = [...new Set(sourceIdentities)];
  const verdict = classifyBySourceCount(uniqueSources.length);

  return {
    input: text,
    queries,
    totalMatches: deduped.length,
    uniqueSourceCount: uniqueSources.length,
    uniqueSources,
    verdict,
    analyzedFromUrl,
    sources: deduped.slice(0, 20)
  };
}

async function extractTextFromImage(imageDataUrl) {
  const base64 = String(imageDataUrl || "").split(",")[1];
  if (!base64) {
    throw new Error("Invalid image data");
  }

  const tryLanguages = ["eng", "hin", "eng+hin"];
  let lastError = "OCR failed";

  for (const language of tryLanguages) {
    try {
      const formData = new FormData();
      formData.append("base64Image", `data:image/png;base64,${base64}`);
      formData.append("language", language);
      formData.append("isOverlayRequired", "false");
      formData.append("OCREngine", "2");
      formData.append("apikey", "helloworld");

      const response = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        lastError = `OCR request failed: ${response.status}`;
        continue;
      }

      const data = await response.json();

      if (data.IsErroredOnProcessing) {
        lastError = (data.ErrorMessage || []).join(", ") || "OCR failed";
        continue;
      }

      const text = (data.ParsedResults || [])
        .map(item => item.ParsedText || "")
        .join(" ")
        .trim();

      if (text) return text;
      lastError = "No text detected in screenshot";
    } catch (err) {
      lastError = err.message || "OCR failed";
    }
  }

  throw new Error(lastError);
}
