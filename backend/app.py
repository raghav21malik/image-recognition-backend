import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

from upload    import upload_bp
from history   import history_bp
from benchmark import benchmark_bp

app.register_blueprint(upload_bp,    url_prefix='/api')
app.register_blueprint(history_bp,   url_prefix='/api')
app.register_blueprint(benchmark_bp, url_prefix='/api')

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "status":  "Cloud Image Recognition API is running ✅",
        "message": "Welcome to the backend! Ready for image processing.",
        "routes":  ["/api/upload", "/api/history", "/api/benchmark"]
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
