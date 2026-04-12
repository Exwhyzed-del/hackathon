import os
import subprocess
import json
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from detector.ml_detector import predict_image
from news_detector.news_logic import verify_news

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return render_template("index.html")

@app.route('/analyze-news', methods=['POST'])
def analyze_news():
    data = request.json
    text = data.get("text")

    if not text:
        return jsonify({"success": False, "error": "No text provided"}), 400

    try:
        result = verify_news(text)
        return jsonify({"success": True, "result": result})
    except Exception as e:
        print(f"News verification error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/detect-image', methods=['POST'])
def detect_image():
    data = request.json
    image_url = data.get("image_url")

    if not image_url:
        return jsonify({"error": "No image URL"}), 400

    result = predict_image(image_url)
    return jsonify(result)

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files.get('file')

    if not file:
        return jsonify({"label": "ERROR", "confidence": 0})

    filepath = "temp.jpg"
    file.save(filepath)

    try:
        result = predict_image(filepath)
        return jsonify({
            "label": result.get("label", "REAL"),
            "confidence": result.get("confidence", 0)
        })
    except Exception as e:
        print(e)
        return jsonify({"label": "ERROR", "confidence": 0})

@app.route('/analyze-audio', methods=['POST'])
def analyze_audio():
    # Both 'audio' and 'file' are supported as keys for the file
    file = request.files.get('audio') or request.files.get('file')

    if not file:
        return jsonify({"error": "No audio file uploaded"}), 400

    # Create a temporary file to store the uploaded audio
    temp_path = os.path.join(os.getcwd(), "temp_audio_file")
    file.save(temp_path)

    try:
        # Run the analyzer.py script using subprocess
        # We use the same logic as the Node.js server from AudioShield2.0
        process = subprocess.Popen(
            ['python', 'analyzer.py', temp_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate()

        if process.returncode != 0:
            print(f"Analyzer error: {stderr}")
            return jsonify({"error": "Failed to analyze audio", "details": stderr}), 500

        # The python script should print a JSON string as the last line
        lines = stdout.strip().split('\n')
        last_line = lines[-1]
        result = json.loads(last_line)

        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return jsonify(result)

    except Exception as e:
        print(f"Server error: {e}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": "Processing error", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)