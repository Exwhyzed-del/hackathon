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

if __name__ == '__main__':
    app.run(debug=True)