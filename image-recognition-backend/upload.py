from flask import Blueprint, request, jsonify
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

        # --- PHASE 2: Cloudinary upload will be added here ---
        image_url = "pending_cloudinary_setup"

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
            "filename": file.filename,
            "ai_results": ai_results,
            "message": "Phase 1 working ✅ — AI and Storage will be connected in next phases"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
