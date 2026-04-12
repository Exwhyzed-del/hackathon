# 🛡️ DeepShield AI - Unified Media & News Integrity System

DeepShield AI is a production-ready, full-stack AI platform designed to protect users from digital misinformation. It provides real-time detection of **AI-generated images**, **deepfake audio**, and **verifies news authenticity** through a seamless combination of a web dashboard and specialized browser extensions.

---

## 🚀 Key Features

### 1. AI Media Detection (DeepShield)
- **Deepfake Analysis**: Leverages a custom-trained **EfficientNet-B0** model to identify AI-generated images.
- **Real-time Social Media Protection**: Automatically analyzes images on platforms like Instagram and overlays authenticity badges (✅ Real, 🤖 AI Generated, ✨ Filtered).
- **Web Dashboard**: Support for direct image uploads for deep-level forensic analysis.

### 2. Audio Guard (AudioShield 2.0)
- **Speech Authenticity**: Detects AI-generated speech and deepfake audio using MFCC feature extraction and deep learning.
- **Tab Capture**: Real-time scanning of audio playing in any browser tab (e.g., YouTube, Podcasts).
- **File Analysis**: Upload MP3, WAV, or M4A files to verify their origin.
- **Integrated Backend**: Seamlessly processes audio data through the Flask backend using specialized Python analyzers.

### 3. News Guard (VeriShield)
- **Cross-Reference Verification**: Validates news claims or URLs against a massive database of trusted global news sources.
- **Floating Shield Tool**: A browser-native selection tool that allows users to verify any text or screen area using OCR technology.
- **Multi-Source Corroboration**: Searches multiple news indices (Google News RSS, DuckDuckGo) to find independent reporting.

---

## 🛠️ Technology Stack

- **Backend**: Python (Flask, Flask-CORS)
- **AI Engines**: 
  - **Vision**: PyTorch, Torchvision, OpenCV
  - **Audio**: Librosa, TensorFlow, Scikit-learn
- **OCR**: OCR.space API / Tesseract.js
- **Frontend**: Modern Glassmorphism UI (HTML5, CSS3, JavaScript, Chart.js)
- **Extensions**: Chrome Extension Manifest V3 (Service Workers, Offscreen Documents, SidePanel API)

---

## 📁 Project Structure

```
DeepShieldAI/
├── app.py                 # Core Flask backend server
├── analyzer.py            # Audio deepfake analysis logic
├── detector/              # Image analysis & AI model logic
├── news_detector/         # News verification & web scraping logic
├── unified_extension/     # Extension for AI Images & News Verification
├── audio_extension/       # Extension for Audio Deepfake Detection
├── static/                # CSS (Glassmorphism), JS, and assets
├── templates/             # Dashboard HTML templates
└── requirements.txt       # Python dependencies
```

---

## ⚙️ Installation & Setup

### 1. Set Up Environment
```bash
# Install dependencies
pip install -r requirements.txt
```

### 2. Start the Backend Server
```bash
python app.py
```
The server will run locally at `http://localhost:5000`.

### 3. Install Chrome Extensions
1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer Mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the **`unified_extension`** folder for Image/News protection.
5. Click **Load unpacked** again and select the **`audio_extension`** folder for Audio protection.

---

## 🛡️ Usage Instructions

- **Web Dashboard**: Open [http://localhost:5000/](http://localhost:5000/) to access the integrated console. Use the sidebar to switch between **Image Detection**, **News Guard**, and the new **Audio Guard**.
- **Browser Protection**:
    - **Unified Extension**: Pin the extension to your toolbar. It automatically adds badges to images and provides a right-click "Verify news" option.
    - **Audio Extension**: Use the popup to start "Tab Capture" for live audio or upload a recording for instant analysis.

---

## ⚖️ License & Disclaimer
This tool is for educational and research purposes. AI detection is a probabilistic process and should be used as a supplementary tool for verifying digital content.
