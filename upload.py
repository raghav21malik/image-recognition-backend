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

# Google Vision Config
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
VISION_API_URL = f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_API_KEY}"


@upload_bp.route('/upload', methods=['POST'])
def upload_image():

    # DEBUG LOGS
    print("=" * 50)
    print("CONTENT TYPE:", request.content_type)
    print("FILES:", request.files)
    print("FORM:", request.form)
    print("=" * 50)

    if 'image' not in request.files:
        return jsonify({
            "error": "No image file provided",
            "content_type": str(request.content_type),
            "files_received": list(request.files.keys()),
            "form_received": list(request.form.keys())
        }), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({
            "error": "No file selected"
        }), 400

    try:

        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(file)

        img_url = upload_result.get('secure_url')
        pub_id = upload_result.get('public_id')
        width = upload_result.get('width')
        height = upload_result.get('height')
        fmt = upload_result.get('format')
        size = upload_result.get('bytes')

        # Google Vision Request
        vision_payload = {
            "requests": [
                {
                    "image": {
                        "source": {
                            "imageUri": img_url
                        }
                    },
                    "features": [
                        {
                            "type": "LABEL_DETECTION",
                            "maxResults": 5
                        },
                        {
                            "type": "OBJECT_LOCALIZATION",
                            "maxResults": 5
                        },
                        {
                            "type": "TEXT_DETECTION",
                            "maxResults": 1
                        },
                        {
                            "type": "LANDMARK_DETECTION",
                            "maxResults": 1
                        },
                        {
                            "type": "IMAGE_PROPERTIES",
                            "maxResults": 1
                        }
                    ]
                }
            ]
        }

        vision_response = requests.post(
            VISION_API_URL,
            json=vision_payload
        ).json()

        print("VISION RESPONSE:", vision_response)

        if "responses" not in vision_response:
            return jsonify({
                "error": "Google Vision API failed",
                "details": vision_response
            }), 500

        annotations = vision_response["responses"][0]

        labels = [
            label["description"]
            for label in annotations.get("labelAnnotations", [])
        ]

        objects = [
            obj["name"]
            for obj in annotations.get("localizedObjectAnnotations", [])
        ]

        text_annotations = annotations.get("textAnnotations", [])
        detected_text = (
            text_annotations[0]["description"]
            if text_annotations else None
        )

        landmark_annotations = annotations.get("landmarkAnnotations", [])
        landmark = (
            landmark_annotations[0]["description"]
            if landmark_annotations else None
        )

        dominant_colors = []

        img_props = annotations.get(
            "imagePropertiesAnnotation",
            {}
        )

        if img_props and "dominantColors" in img_props:

            for color_info in img_props["dominantColors"].get(
                "colors",
                []
            )[:3]:

                c = color_info.get("color", {})

                dominant_colors.append(
                    f"rgb({c.get('red',0)}, "
                    f"{c.get('green',0)}, "
                    f"{c.get('blue',0)})"
                )

        # Save to Supabase
        db_data = {
            "filename": file.filename,
            "image_url": img_url,
            "public_id": pub_id,
            "width": width,
            "height": height,
            "format": fmt,
            "size_bytes": size,
            "labels": labels,
            "objects": objects,
            "detected_text": detected_text,
            "landmark": landmark,
            "dominant_colors": dominant_colors
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
                "labels": labels,
                "objects": objects,
                "detected_text": detected_text,
                "landmark": landmark,
                "dominant_colors": dominant_colors
            }
        }), 200

    except Exception as e:

        print("UPLOAD ERROR:", str(e))

        return jsonify({
            "error": str(e)
        }), 500
