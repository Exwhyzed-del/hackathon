import re
import requests
import urllib.parse
from bs4 import BeautifulSoup
import html
from concurrent.futures import ThreadPoolExecutor, as_completed

def normalize_text(text):
    if not text:
        return ""
    text = str(text)
    text = re.sub(r'\s+', ' ', text)
    # Basic normalization similar to the JS version
    return text.strip()

def strip_html(html_str):
    if not html_str:
        return ""
    html_str = str(html_str)
    html_str = re.sub(r'<script[\s\S]*?<\/script>', ' ', html_str, flags=re.IGNORECASE)
    html_str = re.sub(r'<style[\s\S]*?<\/style>', ' ', html_str, flags=re.IGNORECASE)
    html_str = re.sub(r'<[^>]+>', ' ', html_str)
    html_str = html.unescape(html_str)
    return normalize_text(html_str)

def get_domain(url):
    try:
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain
    except:
        return ""

def clean_google_news_redirect(url):
    try:
        parsed = urllib.parse.urlparse(url)
        if "news.google.com" in parsed.netloc:
            query = urllib.parse.parse_qs(parsed.query)
            if 'url' in query:
                return query['url'][0]
        return url
    except:
        return url

def is_news_like_domain(domain):
    if not domain:
        return False
    
    blocked = [
        "play.google.com", "apkpure.com", "apkcombo.com", "uptodown.com",
        "apkmirror.com", "happymod.com", "softonic.com", "cnet.com",
        "youtube.com", "youtu.be", "reddit.com", "instagram.com",
        "facebook.com", "x.com", "twitter.com", "tiktok.com",
        "pinterest.com", "quora.com", "medium.com", "linkedin.com", "law360.com"
    ]
    if domain in blocked:
        return False

    strong_news_domains = [
        "bbc.com", "reuters.com", "apnews.com", "thehindu.com", "ndtv.com",
        "indiatoday.in", "indianexpress.com", "hindustantimes.com", "theprint.in",
        "timesofindia.indiatimes.com", "aljazeera.com", "cnn.com", "nytimes.com",
        "theguardian.com", "washingtonpost.com", "npr.org", "abcnews.go.com",
        "cnbc.com", "bloomberg.com", "wsj.com", "news18.com", "firstpost.com",
        "dw.com", "france24.com", "abc.net.au", "cbc.ca", "usatoday.com",
        "sky.com", "economictimes.indiatimes.com", "livemint.com", "moneycontrol.com",
        "scroll.in", "deccanherald.com", "telegraphindia.com", "newindianexpress.com",
        "thewire.in"
    ]
    
    if any(domain == d or domain.endswith("." + d) for d in strong_news_domains):
        return True

    blocked_words = [
        "law", "legal", "lawsuit", "attorney", "firm", "court", "archive",
        "dictionary", "wiki", "forum", "docs", "pdf", "researchgate",
        "responsibility", "committee", "center", "centre", "policy", "petition"
    ]
    if any(word in domain for word in blocked_words):
        return False

    return bool(re.search(r'(news|times|post|herald|tribune|journal|media|today|express|chronicle|telegraph|standard|mirror|wire|observer|gazette)', domain, re.I))

def get_source_identity(item):
    source_name = str(item.get('source', '')).strip().lower()
    if source_name:
        return source_name
    
    domain = get_domain(item.get('url', ''))
    if domain in ["news.google.com", "google.com", "duckduckgo.com", "html.duckduckgo.com"]:
        return ""
    return domain

def extract_url_from_text(text):
    match = re.search(r'https?://[^\s]+', str(text), re.I)
    return match.group(0) if match else ""

def fetch_article_text_from_url(url):
    try:
        resp = requests.get(url, timeout=10)
        if resp.status_code != 200:
            return ""
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        title = soup.title.string if soup.title else ""
        
        meta_desc = ""
        desc_tag = soup.find('meta', attrs={'name': 'description'}) or \
                   soup.find('meta', attrs={'property': 'og:description'})
        if desc_tag:
            meta_desc = desc_tag.get('content', '')
            
        return normalize_text(f"{title}. {meta_desc}")
    except:
        return ""

def split_sentences(text):
    text = normalize_text(text)
    # Basic sentence splitter
    sentences = re.split(r'(?<=[.!?।])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

def build_queries(input_text):
    cleaned = normalize_text(input_text)
    sentences = split_sentences(cleaned)
    queries = []
    
    if len(sentences) > 0: queries.append(sentences[0][:140])
    if len(sentences) > 1: queries.append(sentences[1][:140])
    
    long_clauses = [s.strip() for s in re.split(r'[.!?।]', cleaned) if len(s.strip()) >= 30][:4]
    for clause in long_clauses:
        queries.append(clause[:160])
        
    words = cleaned.split()
    if len(words) > 6:
        queries.append(" ".join(words[:10]))
        
    unique_queries = list(set(q.strip() for q in queries if len(q.strip()) >= 15))[:6]
    return unique_queries

def score_result(result, original_text):
    haystack = normalize_text(f"{result.get('title', '')} {result.get('source', '')} {result.get('domain', '')}").lower()
    
    words = [w.lower() for w in normalize_text(original_text).split() if len(w) > 3][:25]
    
    score = 0
    for word in words:
        if word in haystack:
            score += 1
    return score

def classify_by_source_count(count):
    if count == 0:
        return {"status": "FAKE", "label": "❌ Fake / No matching coverage found", "color": "red"}
    if count < 4:
        return {"status": "SUSPICIOUS", "label": "⚠️ Suspicious / Few sources found", "color": "orange"}
    return {"status": "REAL", "label": "✅ Real / Multiple trusted sources found", "color": "green"}

def search_google_news_rss_one_url(rss_url):
    try:
        resp = requests.get(rss_url, timeout=10)
        if resp.status_code != 200:
            return []
        
        soup = BeautifulSoup(resp.text, 'xml')
        items = []
        for item in soup.find_all('item'):
            title = item.title.text if item.title else ""
            link = item.link.text if item.link else ""
            pub_date = item.pubDate.text if item.pubDate else ""
            source = item.source.text if item.source else ""
            
            url = clean_google_news_redirect(link)
            domain = get_domain(url)
            
            if title and url and is_news_like_domain(domain):
                items.append({
                    "title": title,
                    "url": url,
                    "source": source,
                    "publishedAt": pub_date,
                    "domain": domain
                })
        return items
    except:
        return []

def search_google_news_rss(query):
    rss_urls = [
        f"https://news.google.com/rss/search?q={urllib.parse.quote(query + ' when:30d')}&hl=en-IN&gl=IN&ceid=IN:en",
        f"https://news.google.com/rss/search?q={urllib.parse.quote(query + ' when:30d')}&hl=hi-IN&gl=IN&ceid=IN:hi"
    ]
    
    combined = []
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(search_google_news_rss_one_url, url) for url in rss_urls]
        for future in as_completed(futures):
            combined.extend(future.result())
    return combined

def search_duckduckgo(query):
    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query + ' news')}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            return []
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        items = []
        for result in soup.find_all('a', class_='result__a'):
            raw_url = result.get('href', '')
            # DuckDuckGo HTML results often have a proxy URL
            if raw_url.startswith('//duckduckgo.com/l/?u='):
                raw_url = urllib.parse.unquote(raw_url.split('u=')[1].split('&')[0])
            
            cleaned_url = clean_google_news_redirect(raw_url)
            title = result.text.strip()
            domain = get_domain(cleaned_url)
            
            if title and cleaned_url and is_news_like_domain(domain):
                items.append({
                    "title": title,
                    "url": cleaned_url,
                    "source": "",
                    "publishedAt": "",
                    "domain": domain
                })
        return items
    except:
        return []

def verify_news(user_input):
    text = normalize_text(user_input)
    if not text:
        raise ValueError("No text provided")
        
    possible_url = extract_url_from_text(text)
    analyzed_from_url = False
    
    if possible_url:
        article_text = fetch_article_text_from_url(possible_url)
        if article_text:
            text = article_text
            analyzed_from_url = True
            
    queries = build_queries(text)
    if not queries:
        raise ValueError("Could not create search queries")
        
    raw_results = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = []
        for q in queries:
            futures.append(executor.submit(search_google_news_rss, q))
            futures.append(executor.submit(search_duckduckgo, q))
            
        for future in as_completed(futures):
            raw_results.extend(future.result())
            
    unique_by_url = {}
    for item in raw_results:
        url = item.get('url', '').strip()
        if not url: continue
        
        domain = get_domain(url)
        if not is_news_like_domain(domain): continue
        
        score = score_result(item, text)
        if score < 2: continue
        
        if url not in unique_by_url:
            item['score'] = score
            unique_by_url[url] = item
        else:
            existing = unique_by_url[url]
            existing['source'] = existing.get('source') or item.get('source')
            existing['publishedAt'] = existing.get('publishedAt') or item.get('publishedAt')
            existing['score'] = max(existing['score'], score)
            
    deduped = sorted(unique_by_url.values(), key=lambda x: x['score'], reverse=True)
    deduped = [item for item in deduped if item['score'] >= 2]
    
    source_identities = [get_source_identity(item) for item in deduped]
    unique_sources = list(set(s for s in source_identities if s))
    
    verdict = classify_by_source_count(len(unique_sources))
    
    return {
        "input": text,
        "queries": queries,
        "totalMatches": len(deduped),
        "uniqueSourceCount": len(unique_sources),
        "uniqueSources": unique_sources,
        "verdict": verdict,
        "analyzedFromUrl": analyzed_from_url,
        "sources": deduped[:20]
    }
