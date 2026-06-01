from flask import Blueprint, request, jsonify
from utils.cloudinary_helper import upload_to_cloudinary
import os

upload_bp = Blueprint("upload", __name__)

@upload_bp.route("/upload", methods=["POST"])
def upload_image():
    try:
        # Check if image file is present in request
        if "image" not in request.files:
            return jsonify({"error": "No image file provided"}), 400

        file = request.files["image"]

        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        # Allowed file types
        allowed_extensions = {"png", "jpg", "jpeg", "gif", "webp"}
        file_ext = file.filename.rsplit(".", 1)[-1].lower()
        if file_ext not in allowed_extensions:
            return jsonify({"error": "Invalid file type. Use PNG, JPG, JPEG, GIF or WEBP"}), 400

        image_bytes = file.read()

        # --- PHASE 2: Upload image to Cloudinary ✅ ---
        cloudinary_data = upload_to_cloudinary(image_bytes, file.filename)
        image_url = cloudinary_data["image_url"]
        public_id = cloudinary_data["public_id"]

        # --- PHASE 4: Google Vision AI will be added here ---
        ai_results = {
            "labels": [
                {"name": "Test Label", "confidence": 99.0}
            ],
            "objects": [],
            "text": "",
            "landmark": "",
            "dominant_colors": []
        }

        # --- PHASE 3: Supabase DB save will be added here ---

        return jsonify({
            "success": True,
            "image_url": image_url,
            "public_id": public_id,
            "filename": file.filename,
            "image_meta": {
                "width": cloudinary_data["width"],
                "height": cloudinary_data["height"],
                "format": cloudinary_data["format"],
                "size_bytes": cloudinary_data["size_bytes"]
            },
            "ai_results": ai_results,
            "message": "Image uploaded to Cloudinary ✅ — AI coming in Phase 4"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
