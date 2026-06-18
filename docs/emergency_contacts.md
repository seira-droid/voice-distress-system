# Emergency Contacts API

## Get All Contacts

GET /api/emergency-contacts/

## Create Contact

POST /api/emergency-contacts/

Example Request:

```json
{
  "name": "John Doe",
  "phone_number": "9876543210",
  "relationship": "Friend"
}
```

## Update Contact

PUT /api/emergency-contacts/{id}/

## Delete Contact

DELETE /api/emergency-contacts/{id}/
