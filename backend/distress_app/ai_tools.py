from distress_app.models import EmergencyContact


def get_emergency_contacts(user_id=None):
    """
    Returns all emergency contacts for the given user.
    If user_id is None, returns all contacts.
    """

    if user_id:
        contacts = EmergencyContact.objects.filter(user_id=user_id)
    else:
        contacts = EmergencyContact.objects.all()

    return [
        {
            "name": contact.name,
            "relationship": contact.relationship,
            "phone_number": contact.phone_number,
            "telegram_chat_id": contact.telegram_chat_id,
        }
        for contact in contacts
    ]