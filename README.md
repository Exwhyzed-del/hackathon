# 🛡️ DeepShield Unified - AI Media & News Integrity System

DeepShield Unified is a production-ready, full-stack AI platform designed to protect users from digital misinformation. It provides real-time detection of **AI-generated deepfakes** and **verifies news authenticity** through a seamless combination of a web dashboard and a browser extension.

---

## 🚀 Key Features

### 1. AI Media Detection (DeepShield)
- **Deepfake Analysis**: Leverages a custom-trained **EfficientNet-B0** model to identify AI-generated images.
- **Real-time Social Media Protection**: Automatically analyzes images on platforms like Instagram and overlays authenticity badges (✅ Real, 🤖 AI Generated, ✨ Filtered).
- **Ensemble Logic**: Uses a multi-stage detection process, combining local model speed with cloud-based API fallbacks for high-confidence results.
- **Web Dashboard**: Support for direct image uploads for deep-level forensic analysis.

### 2. News Guard (VeriShield)
- **Cross-Reference Verification**: Validates news claims or URLs against a massive database of trusted global news sources.
- **Floating Shield Tool**: A browser-native selection tool that allows users to verify any text or screen area using OCR technology.
- **Multi-Source Corroboration**: Searches multiple news indices (Google News RSS, DuckDuckGo) to find independent reporting on a claim.
- **Visual Verdicts**: Provides clear credibility ratings based on source count and domain reputation.

---

## 🛠️ Technology Stack

- **Backend**: Python (Flask, Flask-CORS)
- **AI Engine**: PyTorch, Torchvision, OpenCV
- **OCR**: OCR.space API / Tesseract.js
- **Frontend**: Modern Glassmorphism UI (HTML5, CSS3, JavaScript, Chart.js)
- **Extension**: Chrome Extension Manifest V3 (Service Workers, Content Scripts, SidePanel API)

---

## 📁 Project Structure

```
DeepShieldUnified/
├── app.py                 # Core Flask backend server
├── detector/              # Image analysis & AI model logic
├── news_detector/         # News verification & web scraping logic
├── extension/             # Unified Chrome Extension
│   └── deepshield-unified/
│       ├── manifest.json  # Manifest V3 configuration
│       ├── background.js  # Service worker (OCR & API management)
│       ├── content.js     # On-page image detection & selection UI
│       └── sidepanel/     # Detailed news analysis interface
├── static/                # CSS (Glassmorphism), JS, and assets
├── templates/             # Dashboard HTML templates
└── deepfake_model.pth     # Pre-trained EfficientNet model weights
```

---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Exwhyzed-del/Aryan.git
cd Aryan
```

### 2. Set Up Environment
```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Start the Backend Server
```bash
python app.py
```
The server will run locally at `http://127.0.0.1:5000`.

### 4. Install Chrome Extension
1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer Mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `extension/deepshield-unified` folder from this repository.

---

## 🛡️ Usage Instructions

- **Web Dashboard**: Use the sidebar to switch between the **AI Media Dashboard** (for uploads) and **News Guard** (for text/URL verification).
- **Browser Protection**:
    - **Instagram/Social Media**: Watch for the auto-generated badges on images.
    - **Verification Button**: Use the floating 🛡️ button to select any area on a webpage for verification.
    - **Context Menu**: Right-click any highlighted text and select **"Verify news credibility"**.

---

## ⚖️ License & Disclaimer
This tool is for educational and research purposes. AI detection is a probabilistic process and should be used as a supplementary tool for verifying digital content.
