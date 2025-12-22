# Apricot360 API Design Documentation

## Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        A[Mastra Tools]
    end
    
    subgraph "API Layer"
        B[apricot-api.ts]
        B1[authenticate]
        B2[getUsers]
        B3[Token Cache]
    end
    
    subgraph "Apricot360 API"
        C[OAuth Endpoint]
        D[Users Endpoint]
    end
    
    A -->|Uses| B
    B1 -->|POST /sandbox/oauth/token| C
    B2 -->|GET /sandbox/users| D
    B2 -->|Uses| B1
    B3 -->|Caches| B1
    
    style A fill:#e1f5ff
    style B fill:#fff3e0
    style C fill:#f3e5f5
    style D fill:#f3e5f5
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant Client as Client/Tool
    participant API as apricot-api
    participant Cache as Token Cache
    participant Apricot as Apricot360 API
    
    Client->>API: Request Data (getUsers)
    API->>Cache: Check cached token
    
    alt Token Valid
        Cache-->>API: Return cached token
    else Token Expired/Missing
        API->>Apricot: POST /sandbox/oauth/token
        Note over API,Apricot: client_credentials grant
        Apricot-->>API: access_token + expires_in
        API->>Cache: Cache token with expiry
    end
    
    API->>Apricot: GET /sandbox/users
    Note over API,Apricot: Bearer token authentication
    
    alt Success (200)
        Apricot-->>API: Users data
        API-->>Client: Return users
    else Unauthorized (401)
        Apricot-->>API: 401 Error
        API->>Cache: Invalidate token
        API->>API: Retry (max 1 retry)
    end
```

## Data Models

```mermaid
classDiagram
    class OAuthTokenResponse {
        +string access_token
        +string token_type
        +number expires_in
        +string scope
    }
    
    class UserData {
        +number id
        +string type
        +UserAttributes attributes
        +UserLinks links
    }
    
    class UserAttributes {
        +number org_id
        +string username
        +string user_type
        +string name_first
        +string name_middle
        +string name_last
        +number login_attempts
        +string mod_time
        +number mod_user
        +number active
        +string password_reset
    }
    
    class UserLinks {
        +string additionalProp1
        +string additionalProp2
        +string additionalProp3
    }
    
    class UsersResponse {
        +Meta meta
        +UserData[] data
    }
    
    class Meta {
        +number count
    }
    
    class GetUsersOptions {
        +number pageSize
        +number pageNumber
        +string sort
        +Record filters
    }
    
    UsersResponse --> Meta
    UsersResponse --> UserData
    UserData --> UserAttributes
    UserData --> UserLinks
```

## API Endpoints

### 1. Authentication Endpoint

**Endpoint:** `POST /sandbox/oauth/token`

**Request:**
```json
{
  "grant_type": "client_credentials",
  "client_id": "{APRICOT_CLIENT_ID}",
  "client_secret": "{APRICOT_CLIENT_SECRET}"
}
```

**Response:**
```json
{
  "access_token": "string",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "string"
}
```

### 2. Users Endpoint

**Endpoint:** `GET /sandbox/users`

**Query Parameters:**
- `page[size]` - Number of users per page
- `page[number]` - Page number
- `sort` - Field to sort by (prefix with `-` for descending)
- `filter[fieldname]` - Filter by field value

**Response:**
```json
{
  "meta": {
    "count": 100
  },
  "data": [
    {
      "id": 123,
      "type": "users",
      "attributes": {
        "org_id": 456,
        "username": "john.doe",
        "user_type": "admin",
        "name_first": "John",
        "name_middle": "",
        "name_last": "Doe",
        "login_attempts": 0,
        "mod_time": "2024-01-01T00:00:00Z",
        "mod_user": 789,
        "active": 1,
        "password_reset": ""
      },
      "links": {}
    }
  ]
}
```

## Mastra Tools

```mermaid
graph LR
    subgraph "Mastra Tools Layer"
        T1[getUsersFromApricot]
        T2[searchApricotUsersByName]
        T3[getApricotUserById]
        T4[testApricotAuth]
    end
    
    subgraph "API Functions"
        F1[getUsers]
        F2[authenticate]
    end
    
    T1 -->|pageSize, pageNumber, sort, filters| F1
    T2 -->|firstName, lastName, username| F1
    T3 -->|userId| F1
    T4 --> F2
    
    F1 --> F2
    
    style T1 fill:#c8e6c9
    style T2 fill:#c8e6c9
    style T3 fill:#c8e6c9
    style T4 fill:#c8e6c9
```

### Tool Descriptions

#### 1. `getUsersFromApricot`
- **ID:** `get-users-from-apricot`
- **Purpose:** Fetch users with optional pagination, sorting, and filtering
- **Input:** `pageSize`, `pageNumber`, `sort`, `filters`
- **Output:** Array of users with count and success status

#### 2. `searchApricotUsersByName`
- **ID:** `search-apricot-users-by-name`
- **Purpose:** Search users by first name, last name, or username
- **Input:** `firstName`, `lastName`, `username` (at least one required)
- **Output:** Array of matching users

#### 3. `getApricotUserById`
- **ID:** `get-apricot-user-by-id`
- **Purpose:** Get a specific user by their unique ID
- **Input:** `userId`
- **Output:** Single user object or null if not found

#### 4. `testApricotAuth`
- **ID:** `test-apricot-auth`
- **Purpose:** Test authentication with Apricot360 API
- **Input:** None
- **Output:** Success status, message, and token availability

## Token Management Strategy

```mermaid
stateDiagram-v2
    [*] --> NoToken: Initial State
    
    NoToken --> Authenticating: authenticate() called
    Authenticating --> TokenCached: Success
    Authenticating --> Error: Failed
    
    TokenCached --> Valid: Token not expired
    TokenCached --> Expired: Token expired
    
    Valid --> InUse: Use in API call
    InUse --> Valid: Success
    InUse --> Invalidated: 401 Error
    
    Expired --> Authenticating: Re-authenticate
    Invalidated --> Authenticating: Retry
    
    Error --> [*]: Throw error
    
    note right of TokenCached
        Token cached with:
        - access_token
        - expiry time (expires_in - 60s buffer)
    end note
```

## Key Features

### 1. Token Caching
- Tokens are cached in memory with expiration tracking
- 60-second buffer before actual expiry to prevent edge cases
- Automatic invalidation on 401 errors

### 2. Retry Logic
- Automatic retry on 401 (Unauthorized) errors
- Maximum of 1 retry attempt
- Token invalidation before retry

### 3. Query Building
- Dynamic query string construction
- Support for pagination (`page[size]`, `page[number]`)
- Support for sorting (ascending/descending)
- Support for multiple filters

### 4. Error Handling
- Detailed error messages with status codes
- Graceful degradation in tools
- Console logging for debugging

## Environment Variables

Required environment variables:

```bash
APRICOT_API_BASE_URL=https://api.apricot360.com
APRICOT_CLIENT_ID=your_client_id
APRICOT_CLIENT_SECRET=your_client_secret
```

## Error Codes

| Code | Description | Handling |
|------|-------------|----------|
| 200 | Success | Return data |
| 401 | Unauthorized | Invalidate token and retry (once) |
| 4xx | Client error | Throw error with message |
| 5xx | Server error | Throw error with message |

## Best Practices

1. **Always use the tool layer** - Don't call API functions directly unless necessary
2. **Leverage token caching** - The API automatically handles token lifecycle
3. **Use filters wisely** - Apply filters to reduce data transfer
4. **Handle errors gracefully** - All tools return success/error status
5. **Test authentication first** - Use `testApricotAuth` before other operations
