# app.py
from flask import Flask, request, jsonify
import ml  # replace with your actual ML logic
from flask_cors import CORS  # Add this import

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Add this line to enable CORS


@app.route('/analyse', methods=['POST'])
def analyse():
    data = request.json  # optional: get data from frontend if needed
    result = ml.run_analysis(data)  # your function
    return jsonify(result)

if __name__ == '__main__':
    app.run(port=5001)
