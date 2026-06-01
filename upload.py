import os
from flask import Blueprint, request, jsonify
import cloudinary
import cloudinary.uploader
import requests
from supabase import create_client, Client

upload_bp = Blueprint('upload', __name__)

# 1. Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

# 2. Configure Supabase
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
if url and url.endswith('/rest/v1/'):
    url = url.replace('/rest/v1/', '')
supabase: Client = create_client(url, key)

# 3. Google Vision API Endpoint Config
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
VISION_API_URL = f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_API_KEY}"

@upload_bp.route('/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        # Step A: Upload image to Cloudinary cloud storage
        upload_result = cloudinary.uploader.upload(file)
        img_url = upload_result.get('secure_url')
        pub_id = upload_result.get('public_id')
        width = upload_result.get('width')
        height = upload_result.get('height')
        fmt = upload_result.get('format')
        size = upload_result.get('bytes')

        # Step B: Call Google Cloud Vision API using the Cloudinary URL
        vision_payload = {
            "requests": [
                {
                    "image": {"source": {"imageUri": img_url}},
                    "features": [
                        {"type": "LABEL_DETECTION", "maxResults": 5},
                        {"type": "OBJECT_LOCALIZATION", "maxResults": 5},
                        {"type": "TEXT_DETECTION", "maxResults": 1},
                        {"type": "LANDMARK_DETECTION", "maxResults": 1},
                        {"type": "IMAGE_PROPERTIES", "maxResults": 1}
                    ]
                }
            ]
        }
        
        vision_response = requests.post(VISION_API_URL, json=vision_payload).json()
        annotations = vision_response['responses'][0]

        # Step C: Parse Google Vision AI Response
        labels = [label['description'] for label in annotations.get('labelAnnotations', [])]
        objects = [obj['name'] for obj in annotations.get('localizedObjectAnnotations', [])]
        
        text_annotations = annotations.get('textAnnotations', [])
        detected_text = text_annotations[0]['description'] if text_annotations else None
        
        landmark_annotations = annotations.get('landmarkAnnotations', [])
        landmark = landmark_annotations[0]['description'] if landmark_annotations else None

        # Extract dominant colors safely
        dominant_colors = []
        img_props = annotations.get('imagePropertiesAnnotation', {})
        if img_props and 'dominantColors' in img_props:
            for color_info in img_props['dominantColors'].get('colors', [])[:3]:
                c = color_info.get('color', {})
                dominant_colors.append(f"rgb({c.get('red',0)}, {c.get('green',0)}, {c.get('blue',0)})")

        # Step D: Insert the rich AI record into Supabase 'scan_history'
        db_data = {
            "filename": file.filename,
            "image_url": img_url,
            "public_id": pub_id,
            "width": width,
            "height": height,
            "format": fmt,
            "size_bytes": size,
            "labels": labels if labels else None,
            "objects": objects if objects else None,
            "detected_text": detected_text,
            "landmark": landmark,
            "dominant_colors": dominant_colors if dominant_colors else None
        }
        
        supabase.table("scan_history").insert(db_data).execute()
        
        # Return complete AI analysis data back to client
        return jsonify({
            "message": "Image analyzed and saved successfully! 🧠🚀",
            "image_url": img_url,
            "analysis": {
                "labels": labels,
                "objects": objects,
                "detected_text": detected_text,
                "landmark": landmark,
                "dominant_colors": dominant_colors
            }
        }), 200

    except Exception as e:
        return jsonify({"error": f"AI Backend operation failed: {str(e)}"}), 500
