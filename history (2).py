import os
from flask import Blueprint, jsonify, request
from supabase import create_client, Client

history_bp = Blueprint('history', __name__)

# Supabase Config
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

if url and url.endswith('/rest/v1/'):
    url = url.replace('/rest/v1/', '')

supabase: Client = create_client(url, key)


@history_bp.route('/history', methods=['GET'])
def get_history():
    try:

        # ── AUTH: Extract user_id from token if present ──────────
        user_id = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                user_response = supabase.auth.get_user(token)
                user_id = user_response.user.id
            except Exception:
                pass  # Will fall back to returning all records

        # ── Fetch records — filter by user if authenticated ───────
        query = supabase.table("scan_history").select("*")

        if user_id:
            query = query.eq("user_id", user_id)

        response = query.order("created_at", desc=True).execute()

        return jsonify({
            "status":  "success",
            "count":   len(response.data),
            "history": response.data
        }), 200

    except Exception as e:
        return jsonify({"error": f"Database fetch failed: {str(e)}"}), 500
