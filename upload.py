import os
from flask import Blueprint, request, jsonify
import cloudinary
import cloudinary.uploader
import requests
from supabase import create_client, Client

upload_bp = Blueprint('upload', __name__)

# Cloudinary Config
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

# Supabase Config
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if url and url.endswith('/rest/v1/'):
    url = url.replace('/rest/v1/', '')

supabase: Client = create_client(url, key)

# Hugging Face Config
HF_API_TOKEN = os.getenv("HF_API_TOKEN")

HF_API_URL = (
    "https://api-inference.huggingface.co/models/"
    "google/vit-base-patch16-224"
)

HF_HEADERS = {
    "Authorization": f"Bearer {HF_API_TOKEN}"
}


@upload_bp.route('/upload', methods=['POST'])
def upload_image():

    if 'image' not in request.files:
        return jsonify({
            "error": "No image file provided"
        }), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({
            "error": "No file selected"
        }), 400

    try:

        # Upload image to Cloudinary
        upload_result = cloudinary.uploader.upload(file)

        img_url = upload_result.get('secure_url')
        pub_id = upload_result.get('public_id')
        width = upload_result.get('width')
        height = upload_result.get('height')
        fmt = upload_result.get('format')
        size = upload_result.get('bytes')

        # Hugging Face AI Classification
        hf_response = requests.post(
            HF_API_URL,
            headers=HF_HEADERS,
            json={
                "inputs": img_url
            }
        )

        hf_result = hf_response.json()

        print("HF RESULT:", hf_result)

        labels = []

        if isinstance(hf_result, list):
            labels = [
                item.get("label")
                for item in hf_result[:5]
            ]

        db_data = {
            "filename": file.filename,
            "image_url": img_url,
            "public_id": pub_id,
            "width": width,
            "height": height,
            "format": fmt,
            "size_bytes": size,
            "labels": labels,
            "objects": [],
            "detected_text": None,
            "landmark": None,
            "dominant_colors": []
        }

        supabase.table(
            "scan_history"
        ).insert(
            db_data
        ).execute()

        return jsonify({
            "message": "Image analyzed and saved successfully!",
            "image_url": img_url,
            "analysis": {
                "labels": labels
            }
        }), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500
