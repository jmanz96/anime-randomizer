# brings Flask into file so it can be used
from flask import Flask, render_template, jsonify, request
import sqlite3
import json
import requests as http_requests

# creates Flask app
app = Flask(__name__)

# connects to database and returns data
def get_db_connection():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/anime")
def get_anime():
    conn = get_db_connection()
    anime = conn.execute("SELECT * FROM anime").fetchall()
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
    conn.execute(
        """INSERT INTO anime 
        (title, genre, status, rating, image_url, episodes, 
        mal_score, synopsis, studio, year, mal_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (title, genre, status, rating, image_url, episodes,
        mal_score, synopsis, studio, year, mal_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Anime added!"})

@app.route("/anime/<int:id>", methods=["DELETE"])
def delete_anime(id):
    conn = get_db_connection()
    conn.execute("DELETE FROM anime WHERE id = ?", (id,))
    conn.commit()
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
    conn.execute(
        "UPDATE anime SET title=?, genre=?, status=?, rating=? WHERE id=?",
        (title, genre, status, rating, id)
    )
    conn.commit()
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
        return jsonify({"error": str(e)}), 500# only runs if this file running directly
if __name__ == "__main__":
    app.run(debug=True, port=5001)