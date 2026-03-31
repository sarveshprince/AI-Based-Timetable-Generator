from werkzeug.security import generate_password_hash
print(generate_password_hash("Sarvesh10", method="pbkdf2:sha256"))