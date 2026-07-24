
# STRUCTURE: Broswer -> Flask (app.py) -> SQLite (database.db)
# Flask: middleman that reads from dB & sends data to frontend

# FLASK STRUCTURE:
# 1. Each @app.route connects a URL to a function
# 2. GET routes read data, POST creates, PUT updates, DELETE removes
# 3. Every database operation: connect → execute → commit → close
# 4. jsonify() converts Python data to JSON for the frontend
# 5. render_template() serves HTML files from the templates/ folder


# SQL BASICS:
# SELECT * FROM anime       → read all rows
# INSERT INTO anime ...     → add a new row
# UPDATE anime SET ... WHERE id=?  → modify one row (WHERE is critical!)
# DELETE FROM anime WHERE id=?     → remove one row (WHERE is critical!)
# Always use ? placeholders — never put variables directly in SQL (security!)

# brings Flask into file so it can be used; render_template looks inside templates/ folder and serves HTML file given
from flask import Flask, render_template, jsonify, request
import sqlite3


# creates Flask app
app = Flask(__name__)

# connects to database and returns data
def get_db_connection():
        conn = sqlite3.connect("database.db")
        conn.row_factory = sqlite3.Row
        return conn

# tells flask: when someone visits homepage, run the function below
@app.route("/")
def home():
        # serves index.html from templates folder
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
    genre = data["genre"]
    status = data["status"]
    rating = data.get("rating", 0)

    conn = get_db_connection()
    conn.execute(
        "INSERT INTO anime (title, genre, status, rating) VALUES (?, ?, ?, ?)",
        (title, genre, status, rating)
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Anime added!"})

@app.route("/anime/<int:id>", methods=["DELETE"])
def delete_anime(id):
        # deletes anime with matching id from database
        conn = get_db_connection()
        conn.execute("DELETE FROM anime WHERE id = ?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Anime deleted!"})

@app.route("/anime/<int:id>", methods=["PUT"])
def update_anime(id): 
       data = request.get_json(force=True)
       title = data["title"]
       genre = data["genre"]
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


# only runs if this file running directly
if __name__ == "__main__":
        # starts server, debug mode gives helpful error messages
        app.run(debug=True, port=5001)

