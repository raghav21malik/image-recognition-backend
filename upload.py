import os
from flask import Blueprint, request, jsonify
import cloudinary
import cloudinary.uploader

# This name MUST match what app.py imports!
upload_bp = Blueprint('upload', __name__)

# Configure Cloudinary credentials from environment variables
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

@upload_bp.route('/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
        
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        # Upload directly to Cloudinary
        upload_result = cloudinary.uploader.upload(file)
        
        return jsonify({
            "message": "Image uploaded successfully to the cloud! 🚀",
            "image_url": upload_result.get('secure_url'),
            "public_id": upload_result.get('public_id')
        }), 200

    except Exception as e:
        return jsonify({"error": f"Cloudinary upload failed: {str(e)}"}), 500
