from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

# Register routes
from routes.upload import upload_bp
from routes.history import history_bp

app.register_blueprint(upload_bp)
app.register_blueprint(history_bp)

@app.route("/")
def index():
    return {"status": "Cloud Image Recognition API is running ✅"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
