import os
import time
import requests
from flask import Blueprint, request, jsonify
import concurrent.futures

benchmark_bp = Blueprint('benchmark', __name__)

HF_API_TOKEN = os.getenv("HF_API_TOKEN")
HF_BASE      = "https://router.huggingface.co/hf-inference/models/"
HF_HEADERS   = {"Authorization": f"Bearer {HF_API_TOKEN}"}

# ── 5 Genuinely Different Architecture Families ──────────────
MODELS = [
    {
        "id":           "google/vit-base-patch16-224",
        "name":         "ViT-Base/16",
        "architecture": "Vision Transformer",
        "family":       "Pure Transformer",
        "org":          "Google",
        "year":         "2020",
        "params":       "86M",
        "dataset":      "ImageNet-21k",
        "top1":         "85.8%",
        "paper":        "An Image is Worth 16x16 Words",
        "how":          "Splits image into 16×16 patches, treats them as tokens, applies global self-attention across all patches",
        "color":        "#6366f1"
    },
    {
        "id":           "microsoft/resnet-50",
        "name":         "ResNet-50",
        "architecture": "Residual CNN",
        "family":       "Deep CNN",
        "org":          "Microsoft",
        "year":         "2015",
        "params":       "25M",
        "dataset":      "ImageNet-1k",
        "top1":         "80.8%",
        "paper":        "Deep Residual Learning for Image Recognition",
        "how":          "Uses skip connections to train very deep CNNs. Each layer learns residual (difference) rather than full mapping",
        "color":        "#22d3ee"
    },
    {
        "id":           "google/mobilenet_v2_1.0_224",
        "name":         "MobileNet-V2",
        "architecture": "Depthwise Separable CNN",
        "family":       "Lightweight Mobile CNN",
        "org":          "Google",
        "year":         "2018",
        "params":       "3.4M",
        "dataset":      "ImageNet-1k",
        "top1":         "71.8%",
        "paper":        "MobileNetV2: Inverted Residuals and Linear Bottlenecks",
        "how":          "Separates spatial and channel convolutions. 8x fewer parameters than ResNet — designed for mobile/edge devices",
        "color":        "#34d399"
    },
    {
        "id":           "microsoft/swin-tiny-patch4-window7-224",
        "name":         "Swin-Tiny",
        "architecture": "Shifted Window Transformer",
        "family":       "Hierarchical Transformer",
        "org":          "Microsoft",
        "year":         "2021",
        "params":       "28M",
        "dataset":      "ImageNet-1k",
        "top1":         "81.3%",
        "paper":        "Swin Transformer: Hierarchical Vision Transformer using Shifted Windows",
        "how":          "Divides image into local windows, applies attention within windows, then shifts windows each layer for cross-window connection",
        "color":        "#f472b6"
    },
    {
        "id":           "facebook/deit-base-distilled-patch16-224",
        "name":         "DeiT-Base",
        "architecture": "Knowledge Distillation Transformer",
        "family":       "Distilled Transformer",
        "org":          "Meta (Facebook)",
        "year":         "2020",
        "params":       "86M",
        "dataset":      "ImageNet-1k",
        "top1":         "83.4%",
        "paper":        "Training Data-Efficient Image Transformers",
        "how":          "Transformer trained using knowledge distillation from a CNN teacher — learns without large datasets like ViT requires",
        "color":        "#fbbf24"
    },
]

ALLOWED_MODEL_IDS = {m["id"] for m in MODELS}


def run_single_model(model, image_url):
    start = time.time()
    try:
        res = requests.post(
            HF_BASE + model["id"],
            headers=HF_HEADERS,
            json={"inputs": image_url},
            timeout=25
        )
        elapsed = round(time.time() - start, 2)

        if res.status_code != 200:
            return {**model, "status": "error",
                    "error": f"HTTP {res.status_code}",
                    "labels": [], "time_sec": elapsed}

        result = res.json()
        labels = []
        if isinstance(result, list):
            labels = [
                {"name": item.get("label", "Unknown"),
                 "confidence": round(item.get("score", 0) * 100, 2)}
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
        return {**model, "status": "timeout",
                "error": "Model timed out (>25s)",
                "labels": [], "time_sec": round(time.time() - start, 2)}
    except Exception as e:
        return {**model, "status": "error",
                "error": str(e), "labels": [],
                "time_sec": round(time.time() - start, 2)}


@benchmark_bp.route('/benchmark', methods=['POST'])
def run_benchmark():
    try:
        data      = request.get_json()
        image_url = data.get("image_url") if data else None
        if not image_url:
            return jsonify({"error": "image_url is required"}), 400

        total_start = time.time()

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(run_single_model, m, image_url): m for m in MODELS}
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        total_time = round(time.time() - total_start, 2)

        # Sort by original model order
        order = [m["id"] for m in MODELS]
        results.sort(key=lambda x: order.index(x["id"]) if x["id"] in order else 99)

        successful = [r for r in results if r["status"] == "success" and r["top_score"] > 0]
        best_model = max(successful, key=lambda x: x["top_score"])["id"] if successful else None
        fastest    = min(successful, key=lambda x: x["time_sec"])["id"] if successful else None

        return jsonify({
            "success":    True,
            "image_url":  image_url,
            "total_time": total_time,
            "best_model": best_model,
            "fastest":    fastest,
            "results":    results,
            "models_info": MODELS
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@benchmark_bp.route('/models', methods=['GET'])
def get_models():
    """Return all model info for frontend display."""
    return jsonify({"models": MODELS}), 200
