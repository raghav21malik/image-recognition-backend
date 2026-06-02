import os
from flask import Blueprint, jsonify
from supabase import create_client, Client

# This name must match your app.py imports
history_bp = Blueprint('history', __name__)

# Initialize Supabase client directly using your Render environment variables
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

# Clean up trailing URL parts if needed to ensure connection compatibility
if url and url.endswith('/rest/v1/'):
    url = url.replace('/rest/v1/', '')

supabase: Client = create_client(url, key)

@history_bp.route('/history', methods=['GET'])
def get_history():
    try:
        # Fetch records from your scan_history table, ordered by latest first
        response = supabase.table("scan_history")\
    .select("*")\
    .execute()
        
        return jsonify({
            "status": "success",
            "count": len(response.data),
            "history": response.data
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Database fetch failed: {str(e)}"}), 500
