from pathlib import Path
from flask import Blueprint, send_from_directory


app = Blueprint('gridchen', __name__)
ROOT_PATH: Path = Path(__file__).parent


@app.route('<path:resource>', methods=['GET'])
def serve_static(resource):
    return send_from_directory(ROOT_PATH, resource)
