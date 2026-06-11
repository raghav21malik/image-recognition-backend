import os
import time
import requests
from flask import Blueprint, request, jsonify
from supabase import create_client, Client
import concurrent.futures

benchmark_bp = Blueprint('benchmark', __name__)

# Supabase Config
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
if url and url.endswith('/rest/v1/'):
    url = url.replace('/rest/v1/', '')
supabase: Client = create_client(url, key)

# Hugging Face Config
HF_API_TOKEN = os.getenv("HF_API_TOKEN")
HF_BASE      = "https://router.huggingface.co/hf-inference/models/"
HF_HEADERS   = {"Authorization": f"Bearer {HF_API_TOKEN}"}

# ── 5 Models ──────────────────────────────────────────────────
MODELS = [
    {
        "id":           "google/vit-base-patch16-224",
        "name":         "ViT-Base/16",
        "architecture": "Vision Transformer",
        "description":  "Google's Vision Transformer — splits image into 16×16 patches",
        "color":        "#6366f1"
    },
    {
        "id":           "microsoft/resnet-50",
        "name":         "ResNet-50",
        "architecture": "Residual Network",
        "description":  "Microsoft's deep residual learning — industry standard CNN",
        "color":        "#22d3ee"
    },
    {
        "id":           "google/efficientnet-b0",
        "name":         "EfficientNet-B0",
        "architecture": "EfficientNet",
        "description":  "Google's compound scaling — best accuracy/speed tradeoff",
        "color":        "#34d399"
    },
    {
        "id":           "facebook/convnext-tiny-224",
        "name":         "ConvNeXt-Tiny",
        "architecture": "Modern CNN",
        "description":  "Meta's modernized CNN — matches transformers in performance",
        "color":        "#f472b6"
    },
    {
        "id":           "microsoft/beit-base-patch16-224",
        "name":         "BEiT-Base/16",
        "architecture": "BERT for Vision",
        "description":  "Microsoft's BERT pre-training applied to vision tasks",
        "color":        "#fbbf24"
    },
]


def run_single_model(model, image_url):
    """Run one model and return results with timing."""
    start = time.time()
    try:
        res = requests.post(
            HF_BASE + model["id"],
            headers=HF_HEADERS,
            json={"inputs": image_url},
            timeout=20
        )
        elapsed = round(time.time() - start, 2)

        if res.status_code != 200:
            return {
                **model,
                "status":     "error",
                "error":      f"HTTP {res.status_code}",
                "labels":     [],
                "time_sec":   elapsed
            }

        result = res.json()
        labels = []

        if isinstance(result, list):
            labels = [
                {
                    "name":       item.get("label", "Unknown"),
                    "confidence": round(item.get("score", 0) * 100, 2)
                }
                for item in result[:5]
            ]

        return {
            **model,
            "status":    "success",
            "labels":    labels,
            "top_label": labels[0]["name"] if labels else "—",
            "top_score": labels[0]["confidence"] if labels else 0,
            "time_sec":  elapsed
        }

    except requests.exceptions.Timeout:
        return {
            **model,
            "status":   "timeout",
            "error":    "Model timed out (>20s)",
            "labels":   [],
            "time_sec": round(time.time() - start, 2)
        }
    except Exception as e:
        return {
            **model,
            "status":   "error",
            "error":    str(e),
            "labels":   [],
            "time_sec": round(time.time() - start, 2)
        }


@benchmark_bp.route('/benchmark', methods=['POST'])
def run_benchmark():
    try:
        # ── Get image URL from request ──
        data      = request.get_json()
        image_url = data.get("image_url") if data else None

        if not image_url:
            return jsonify({"error": "image_url is required"}), 400

        # ── Run all 5 models in parallel ──
        total_start = time.time()

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = {
                executor.submit(run_single_model, model, image_url): model
                for model in MODELS
            }
            results = []
            for future in concurrent.futures.as_completed(futures):
                results.append(future.result())

        total_time = round(time.time() - total_start, 2)

        # ── Sort by original model order ──
        model_order = [m["id"] for m in MODELS]
        results.sort(key=lambda x: model_order.index(x["id"]) if x["id"] in model_order else 99)

        # ── Find best model (highest top confidence) ──
        successful = [r for r in results if r["status"] == "success" and r["top_score"] > 0]
        best_model = max(successful, key=lambda x: x["top_score"])["id"] if successful else None
        fastest    = min(successful, key=lambda x: x["time_sec"])["id"] if successful else None

        return jsonify({
            "success":    True,
            "image_url":  image_url,
            "total_time": total_time,
            "best_model": best_model,
            "fastest":    fastest,
            "results":    results
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
