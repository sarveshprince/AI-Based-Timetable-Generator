def serialize_user(user):
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "full_name": user["full_name"],
        "email": user["email"],
        "linked_id": user["linked_id"],
    }
