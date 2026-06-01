import os
from flask import Blueprint, request, jsonify
import cloudinary
import cloudinary.uploader
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
        
        # Extract metadata from Cloudinary response
        img_url = upload_result.get('secure_url')
        pub_id = upload_result.get('public_id')
        width = upload_result.get('width')
        height = upload_result.get('height')
        fmt = upload_result.get('format')
        size = upload_result.get('bytes')

        # Step B: Insert the record into your Supabase 'scan_history' table
        db_data = {
            "filename": file.filename,
            "image_url": img_url,
            "public_id": pub_id,
            "width": width,
            "height": height,
            "format": fmt,
            "size_bytes": size,
            "labels": None,          # Placeholder for Phase 4 (AI)
            "objects": None,         # Placeholder for Phase 4 (AI)
            "detected_text": None,   # Placeholder for Phase 4 (AI)
            "landmark": None,        # Placeholder for Phase 4 (AI)
            "dominant_colors": None  # Placeholder for Phase 4 (AI)
        }
        
        supabase.table("scan_history").insert(db_data).execute()
        
        # Return success back to client
        return jsonify({
            "message": "Image uploaded and saved to database successfully! 🚀",
            "image_url": img_url,
            "public_id": pub_id
        }), 200

    except Exception as e:
        return jsonify({"error": f"Upload or Database operation failed: {str(e)}"}), 500
