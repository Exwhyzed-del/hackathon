import requests

API_URL = "https://api-inference.huggingface.co/models/umm-maybe/AI-image-detector"

HEADERS = {
    "Authorization": "Bearer YOUR_API_KEY"
}

def detect_image(image_url):
    try:
        response = requests.post(
            API_URL,
            headers=HEADERS,
            json={"inputs": image_url}
        )

        result_data = response.json()

        is_fake = False
        confidence = 0

        if isinstance(result_data, list):
            for item in result_data:
                label = item.get("label", "").lower()
                score = item.get("score", 0)

                if score > confidence:
                    confidence = score

                if "ai" in label or "fake" in label or "generated" in label:
                    is_fake = True

        return {
            "deepfake": is_fake,
            "confidence": round(confidence * 100, 2)
        }

    except Exception as e:
        return {
            "deepfake": False,
            "confidence": 0,
            "error": str(e)
        }