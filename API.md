# Kaizen API Documentation

## Authentication
The API uses **Bearer Token** authentication. You can authenticate using:
1.  **JWT Token**: Obtained via login (short-lived, for frontend).
2.  **API Token**: Generated in Settings (long-lived, for scripts/curl).

### Headers
Include this header in all authenticated requests:
```
Authorization: Bearer <your_token>
```

---

## Base URL
```
http://localhost:3001
```

---

## Resources

### 1. Measures
Trackable habits or metrics (e.g., "Water", "Gym").

#### List Measures
*   **GET** `/measures`
*   **Response**: `[{ id, name, unit, icon, color, goals[] }]`

#### Create Measure
*   **POST** `/measures`
*   **Body**:
    ```json
    {
      "name": "Reading",
      "unit": "minutes",
      "icon": "Book",
      "color": "blue"
    }
    ```

#### Update Measure
*   **PUT** `/measures/:id`
*   **Body**: `{ "name": "...", "unit": "...", "icon": "...", "color": "..." }`

#### Delete Measure
*   **DELETE** `/measures/:id`

---

### 2. Log Entries
Record progress against your measures.

#### Create Single Entry
*   **POST** `/entries`
*   **Body**:
    ```json
    {
      "measureId": "MEASURE_UUID",
      "value": 30,
      "date": "2024-01-15"
    }
    ```

#### Batch Create Entries (New)
Submit multiple entries at once. Supports looking up measures by **NAME** or **ID**.

*   **POST** `/entries/batch`
*   **Body**:
    ```json
    [
      {
        "measureName": "Reading",
        "value": 30,
        "date": "2024-01-15"
      },
      {
        "measureId": "MEASURE_UUID",
        "value": 1,
        "date": "2024-01-15"
      }
    ]
    ```

#### List Entries
*   **GET** `/entries?start=2024-01-01&end=2024-01-31`

---

### 3. Transactions & Rewards
Manage your point balance.

#### Get Balance & History
*   **GET** `/transactions`

#### Create Manual Transaction
*   **POST** `/transactions`
*   **Body**:
    ```json
    {
      "type": "CREDIT",  // or "DEBIT"
      "amount": 100,
      "title": "Bonus",
      "description": "Optional notes"
    }
    ```

#### Update Transaction
*   **PUT** `/transactions/:id`
*   **Body**: `{ "title": "...", "amount": 50, "notes": "..." }`

#### Delete Transaction
*   **DELETE** `/transactions/:id`
*   *Note: Deleting a transaction reverts the balance change.*

#### Cashout
*   **POST** `/transactions/cashout`
*   **Body**: `{ "amount": 50 }`

---

### 4. API Tokens
Manage long-lived tokens for external scripts.

#### List Tokens
*   **GET** `/api-tokens`

#### Create Token
*   **POST** `/api-tokens`
*   **Body**: `{ "name": "My Script Token" }`
*   **Response**: Returns the raw token **only once**. Save it immediately.

#### Revoke Token
*   **DELETE** `/api-tokens/:id`

---

### 5. Authentication (User)
*   **POST** `/auth/login` - `{ "email": "...", "password": "..." }`
*   **POST** `/auth/signup` - `{ "email": "...", "name": "...", "password": "..." }`
*   **GET** `/auth/demo` - Quickly get a demo user credential.
