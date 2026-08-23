# brings Flask into file so you can use it
from flask import Flask, render_template, jsonify, request
import os
import json
import requests as http_requests
import psycopg2
from psycopg2.extras import RealDictCursor

# creates Flask app
app = Flask(__name__)

# database URL — uses environment variable in production, falls back to local for development
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://anime_randomizer_db_user:y1yBd2kjtDI0wPXg1WGt3ExSaHPqZIy2@dpg-da5kmh8u01pc73fk0c8g-a.virginia-postgres.render.com/anime_randomizer_db")

def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS anime (
            id SERIAL PRIMARY KEY,
            title TEXT,
            genre TEXT,
            status TEXT,
            rating REAL,
            image_url TEXT,
            episodes INTEGER,
            mal_score REAL,
            synopsis TEXT,
            studio TEXT,
            year INTEGER,
            mal_id INTEGER
        )
    """)
    conn.commit()
    cursor.close()
    conn.close()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/anime")
def get_anime():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM anime ORDER BY id")
    anime = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([dict(row) for row in anime])

@app.route("/anime", methods=["POST"])
def add_anime():
    data = request.get_json(force=True)
    title = data["title"]
    genre = data.get("genre", "")
    status = data["status"]
    rating = data.get("rating", 0)
    image_url = data.get("image_url", "")
    episodes = data.get("episodes", None)
    mal_score = data.get("mal_score", None)
    synopsis = data.get("synopsis", "")
    studio = data.get("studio", "")
    year = data.get("year", None)
    mal_id = data.get("mal_id", None)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO anime 
        (title, genre, status, rating, image_url, episodes, 
        mal_score, synopsis, studio, year, mal_id) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (title, genre, status, rating, image_url, episodes,
        mal_score, synopsis, studio, year, mal_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Anime added!"})

@app.route("/anime/<int:id>", methods=["DELETE"])
def delete_anime(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM anime WHERE id = %s", (id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Anime deleted!"})

@app.route("/anime/<int:id>", methods=["PUT"])
def update_anime(id):
    data = request.get_json(force=True)
    title = data["title"]
    genre = data.get("genre", "")
    status = data["status"]
    rating = data.get("rating", 0)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE anime SET title=%s, genre=%s, status=%s, rating=%s WHERE id=%s",
        (title, genre, status, rating, id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Anime updated!"})

@app.route("/search")
def search_anime():
    query = request.args.get("q", "")
    url = f"https://api.jikan.moe/v4/anime?q={query}&limit=5"

    try:
        response = http_requests.get(url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json"
        })
        return jsonify(response.json())
    except Exception as e:
        print(f"Jikan error: {e}")
        return jsonify({"error": str(e)}), 500

# only runs if this file is running directly
if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5001)