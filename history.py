from flask import Blueprint, jsonify

history_bp = Blueprint("history", __name__)

@history_bp.route("/history", methods=["GET"])
def get_history():
    # --- PHASE 3: Will fetch real data from Supabase ---
    return jsonify({
        "success": True,
        "history": [],
        "message": "History endpoint ready ✅ — Supabase will be connected in Phase 3"
    }), 200

@history_bp.route("/history/<int:record_id>", methods=["GET"])
def get_single(record_id):
    # --- PHASE 3: Will fetch single record from Supabase ---
    return jsonify({
        "success": True,
        "record": None,
        "message": f"Record {record_id} endpoint ready ✅"
    }), 200
