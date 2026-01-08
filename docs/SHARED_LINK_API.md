# Shared Link API Specification

## Overview

This API allows partners to programmatically create shareable links that automatically start a chat session with pre-populated participant data or a text query.

## Endpoint

**POST** `https://dev.labs-asp.navateam.com/api/link`

## Request

### Headers

| Header         | Value              | Required |
| -------------- | ------------------ | -------- |
| `Content-Type` | `application/json` | Yes      |

### Body

```json
{
  "content": "string or JSON object (stringified)",
  "expiresInHours": number
}
```

| Field            | Type   | Required | Description                                                                  |
| ---------------- | ------ | -------- | ---------------------------------------------------------------------------- |
| `content`        | string | **Yes**  | Either a plain text query OR a JSON object (as a string) containing participant data. Min: 1 char, Max: 10,000 chars |
| `expiresInHours` | number | No       | How long the link remains valid. Min: 1, Max: 24. **Default: 24**            |

## Content Formats

The `content` field supports two formats:

### Option 1: Plain Text Query

A simple text message that becomes the user's first chat message.

```json
{
  "content": "Help me apply for WIC benefits in Riverside County"
}
```

### Option 2: Structured Participant Data (JSON)

A JSON object containing participant information. The system will automatically:
- Detect the JSON format
- Wrap it with instructions for the AI agent
- Display it nicely in the chat interface

The JSON structure is **flexible** - send whatever fields you have. Common fields include:

```json
{
  "content": "{\"firstName\":\"Maria\",\"lastName\":\"Garcia\",\"dateOfBirth\":\"1990-05-15\",\"phone\":\"555-123-4567\",\"address\":\"123 Main St\",\"city\":\"Riverside\",\"state\":\"CA\",\"zip\":\"92501\",\"householdMembers\":[{\"firstName\":\"Sofia\",\"age\":3,\"relationship\":\"daughter\"}],\"task\":\"Help me apply for WIC benefits\"}"
}
```

**Important:** When sending JSON, the `content` field must be a **stringified JSON object** (use `JSON.stringify()`).

#### Recommended JSON Fields

| Field | Type | Description |
| ----- | ---- | ----------- |
| `firstName` | string | Participant's first name |
| `lastName` | string | Participant's last name |
| `dateOfBirth` | string | Date of birth (YYYY-MM-DD) |
| `phone` / `mobileNumber` | string | Phone number |
| `email` | string | Email address |
| `address` / `addressLine1` | string | Street address |
| `city` | string | City |
| `state` | string | State |
| `zip` / `zipCode` | string | ZIP code |
| `county` | string | County |
| `householdMembers` | array | Array of household member objects |
| `task` / `request` | string | The specific task to perform (defaults to "Help me apply for benefits using this participant data.") |

You can include any additional fields - the AI agent will use whatever data is provided.

## Response

### Success (201 Created)

```json
{
  "url": "https://dev.labs-asp.navateam.com/link/Ab3xY7kP",
  "token": "Ab3xY7kP",
  "expiresAt": "2025-01-07T06:17:00.000Z"
}
```

| Field       | Type                | Description                              |
| ----------- | ------------------- | ---------------------------------------- |
| `url`       | string              | The shareable link to give to end users  |
| `token`     | string              | The unique identifier for this link      |
| `expiresAt` | string (ISO 8601)   | When the link expires                    |

### Errors

| Status | Response                               | Cause                                              |
| ------ | -------------------------------------- | -------------------------------------------------- |
| 400    | `{"error": "Invalid request body"}`    | Missing/invalid `content` or `expiresInHours` out of range |
| 500    | `{"error": "Internal server error"}`   | Server-side issue                                  |

## Examples

### Example 1: Plain Text Query (cURL)

```bash
curl -X POST https://dev.labs-asp.navateam.com/api/link \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Help me apply for WIC benefits in Riverside County",
    "expiresInHours": 8
  }'
```

### Example 2: Structured Participant Data (cURL)

```bash
curl -X POST https://dev.labs-asp.navateam.com/api/link \
  -H "Content-Type: application/json" \
  -d '{
    "content": "{\"firstName\":\"Maria\",\"lastName\":\"Garcia\",\"dateOfBirth\":\"1990-05-15\",\"phone\":\"555-123-4567\",\"address\":\"123 Main St\",\"city\":\"Riverside\",\"state\":\"CA\",\"zip\":\"92501\",\"county\":\"Riverside\",\"householdMembers\":[{\"firstName\":\"Sofia\",\"age\":3,\"relationship\":\"daughter\"},{\"firstName\":\"Carlos\",\"age\":1,\"relationship\":\"son\"}],\"task\":\"Help me apply for WIC benefits\"}",
    "expiresInHours": 8
  }'
```

### Example 3: Python with Participant Data

```python
import json
import requests

# Build participant data as a dictionary
participant_data = {
    "firstName": "Maria",
    "lastName": "Garcia",
    "dateOfBirth": "1990-05-15",
    "phone": "555-123-4567",
    "address": "123 Main St",
    "city": "Riverside",
    "state": "CA",
    "zip": "92501",
    "county": "Riverside",
    "householdMembers": [
        {"firstName": "Sofia", "age": 3, "relationship": "daughter"},
        {"firstName": "Carlos", "age": 1, "relationship": "son"}
    ],
    "task": "Help me apply for WIC benefits"
}

response = requests.post(
    "https://dev.labs-asp.navateam.com/api/link",
    json={
        "content": json.dumps(participant_data),  # Stringify the JSON
        "expiresInHours": 8
    }
)

data = response.json()
print(f"Shareable URL: {data['url']}")
print(f"Expires at: {data['expiresAt']}")
```

### Example 4: JavaScript (Node.js) with Participant Data

```javascript
// Build participant data as an object
const participantData = {
  firstName: "Maria",
  lastName: "Garcia",
  dateOfBirth: "1990-05-15",
  phone: "555-123-4567",
  address: "123 Main St",
  city: "Riverside",
  state: "CA",
  zip: "92501",
  county: "Riverside",
  householdMembers: [
    { firstName: "Sofia", age: 3, relationship: "daughter" },
    { firstName: "Carlos", age: 1, relationship: "son" }
  ],
  task: "Help me apply for WIC benefits"
};

const response = await fetch("https://dev.labs-asp.navateam.com/api/link", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    content: JSON.stringify(participantData),  // Stringify the participant data
    expiresInHours: 8,
  }),
});

const data = await response.json();
console.log(`Shareable URL: ${data.url}`);
console.log(`Expires at: ${data.expiresAt}`);
```

## User Flow

```
┌─────────────────┐      POST /api/link       ┌─────────────────┐
│  Partner System │ ────────────────────────► │   ASP Backend   │
│                 │ ◄──────────────────────── │                 │
└─────────────────┘      { url, token,        └─────────────────┘
                           expiresAt }
        │
        │ Partner redirects user
        │ or displays link
        ▼
┌─────────────────┐      GET /link/{token}    ┌─────────────────┐
│    End User     │ ────────────────────────► │   ASP Backend   │
│                 │ ◄──────────────────────── │                 │
└─────────────────┘      302 Redirect to /    └─────────────────┘
        │                 + cookie with content
        │
        ▼
┌─────────────────┐
│   Chat Page     │  Chat starts with
│   (pre-loaded)  │  pre-populated message
└─────────────────┘
```

1. Partner's system calls `POST /api/link` with the desired chat content
2. API returns a shareable URL
3. Partner redirects their user to that URL (or displays it)
4. User clicks the link and is redirected to the chat page with the message pre-loaded
5. Link expires after the specified time (default 24 hours)

## Notes

- Links are encrypted tokens stored server-side with automatic expiration
- The `content` field can contain the full Amplifi schema payload as a JSON string if needed
- No authentication is currently required for this endpoint
