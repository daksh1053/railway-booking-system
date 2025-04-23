from flask import Flask, request, jsonify
import mysql.connector
import json
from datetime import timedelta
from flask_cors import CORS  # Import the Flask-CORS extension

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Custom JSON encoder to handle timedelta objects
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, timedelta):
            # Convert timedelta to string in format HH:MM:SS
            seconds = int(obj.total_seconds())
            hours, remainder = divmod(seconds, 3600)
            minutes, seconds = divmod(remainder, 60)
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        return super().default(obj)

# Configure Flask to use the custom encoder
app.json_encoder = CustomJSONEncoder

def get_db_connection():
    """Create and return a database connection"""
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="maan8492",
        database="railway_database"
    )

@app.route('/query', methods=['POST'])
def execute_query():
    """Execute SQL query from JSON request and return results as JSON"""
    try:
        # Get the request data
        request_data = request.get_json()
        
        # Check if the query field exists
        if 'query' not in request_data:
            return jsonify({'error': 'Missing query field in request'}), 400
        
        # Get the SQL query
        sql_query = request_data['query']
        
        # Connect to the database
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Execute the query
        cursor.execute(sql_query)
        
        # Check if this is a SELECT query (has results to fetch)
        if cursor.description:
            results = cursor.fetchall()
            response = {
                'status': 'success',
                'results': results,
                'row_count': len(results)
            }
        else:
            # For INSERT, UPDATE, DELETE queries
            connection.commit()
            response = {
                'status': 'success',
                'affected_rows': cursor.rowcount
            }
        
        # Close cursor and connection
        cursor.close()
        connection.close()
        
        return jsonify(response)
    
    except mysql.connector.Error as err:
        return jsonify({
            'status': 'error',
            'error': f"Database error: {str(err)}"
        }), 500
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': f"Server error: {str(e)}"
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
