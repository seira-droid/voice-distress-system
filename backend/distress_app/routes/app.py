from flask import Flask

app = Flask(__name__)

# ----------------------------
# IMPORT BLUEPRINT (AFTER app creation)
# ----------------------------
from routes.ai_routes import ai_routes

# ----------------------------
# REGISTER BLUEPRINT
# ----------------------------
app.register_blueprint(ai_routes)


if __name__ == "__main__":
    app.run(debug=True)