# VOR Backend API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints except `/auth/login` and `/auth/register` require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## 1. Authentication Endpoints
### POST /auth/register
Create new user account
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123",
  "role": "ADMIN|PLANNER|SUPERVISOR|MANAGEMENT"
}
```

### POST /auth/login
Login and get JWT token
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response includes token and user data.

---

## 2. Master Data Endpoints

### Vehicles
- `GET /vehicles` - Get all vehicles
- `GET /vehicles/:id` - Get vehicle by ID
- `POST /vehicles` - Create vehicle (ADMIN only)
- `PUT /vehicles/:id` - Update vehicle (ADMIN only)
- `DELETE /vehicles/:id` - Delete vehicle (ADMIN only)

### Drivers
- `GET /drivers` - Get all drivers
- `GET /drivers/:id` - Get driver by ID
- `POST /drivers` - Create driver (ADMIN only)
- `PUT /drivers/:id` - Update driver (ADMIN only)
- `DELETE /drivers/:id` - Delete driver (ADMIN only)

### Customers
- `GET /customers` - Get all customers
- `GET /customers/:id` - Get customer by ID
- `POST /customers` - Create customer (ADMIN only)
- `PUT /customers/:id` - Update customer (ADMIN only)
- `DELETE /customers/:id` - Delete customer (ADMIN only)

### Master Status
- `GET /master-status` - Get all master statuses (11 seeded records)
- `GET /master-status/code/:code` - Get status by code
- `GET /master-status/group?group=AVAILABLE` - Get statuses by group

---

## 3. Operational Data Endpoints

### Actual Status
Tracks actual vehicle status for each day (PLANNER/ADMIN can write)
- `GET /actual-status/:id` - Get actual status by ID
- `GET /actual-status/vehicle/:vehicleId?startDate=2026-01-01&endDate=2026-01-31` - Get status range
- `POST /actual-status` - Create actual status
  ```json
  {
    "vehicleId": "vehicle-id",
    "date": "2026-01-15T00:00:00Z",
    "statusCode": "OPERASI",
    "notes": "Optional notes"
  }
  ```
- `PUT /actual-status/:id` - Update actual status
  ```json
  {
    "statusCode": "PERBAIKAN",
    "notes": "Under repair"
  }
  ```
- `DELETE /actual-status/:id` - Delete actual status (ADMIN only)
- `POST /actual-status/bulk/update` - Bulk update multiple statuses (PLANNER/ADMIN)
  ```json
  {
    "updates": [
      { "vehicleId": "v1", "date": "2026-01-15", "statusCode": "OPERASI" },
      { "vehicleId": "v2", "date": "2026-01-15", "statusCode": "PERBAIKAN" }
    ]
  }
  ```

### Forecast Status
Predicts vehicle status with confidence level (PLANNER/ADMIN can write)
- `GET /forecast/:id` - Get forecast status by ID
- `GET /forecast/vehicle/:vehicleId?startDate=2026-01-01&endDate=2026-02-28` - Get forecast range
- `POST /forecast` - Create forecast
  ```json
  {
    "vehicleId": "vehicle-id",
    "date": "2026-02-15T00:00:00Z",
    "statusCode": "OPERASI",
    "confidence": 75,
    "notes": "Expected operational"
  }
  ```
- `PUT /forecast/:id` - Update forecast
  ```json
  {
    "statusCode": "PERBAIKAN",
    "confidence": 85,
    "notes": "Scheduled maintenance"
  }
  ```
- `DELETE /forecast/:id` - Delete forecast (ADMIN only)
- `POST /forecast/bulk/update` - Bulk update forecasts

---

## 4. KPI Calculation Endpoints

### Daily KPI
- `GET /kpi/daily?date=2026-01-15` - Get/calculate daily KPI
  - Returns KPA, UA, PA percentages
  - Auto-calculates if not cached
- `POST /kpi/daily/calculate` - Force calculate and save daily KPI (SUPERVISOR/ADMIN)
  ```json
  {
    "date": "2026-01-15"
  }
  ```

### Weekly KPI
- `GET /kpi/weekly?startDate=2026-01-12` - Get/calculate weekly KPI
- `POST /kpi/weekly/calculate` - Force calculate and save weekly KPI (SUPERVISOR/ADMIN)
  ```json
  {
    "startDate": "2026-01-12"
  }
  ```

### Monthly KPI
- `GET /kpi/monthly?year=2026&month=1` - Get/calculate monthly KPI
- `POST /kpi/monthly/calculate` - Force calculate and save monthly KPI (SUPERVISOR/ADMIN)
  ```json
  {
    "year": 2026,
    "month": 1
  }
  ```

#### KPI Formula
- **KPA** (Equipment Productivity Availability) = Available / Total × 100
- **UA** (Equipment Utilization Availability) = Utilized / Available × 100
- **PA** (Overall Productivity Availability) = Productive / Total × 100

Status Grouping:
- Available: SIAP, TUNGGU
- Utilized: OPERASI
- Productive: OPERASI, BOOKING
- Downtime: PERBAIKAN, SERVIS, INSPEKSI

---

## Role-Based Access Control

| Endpoint | ADMIN | PLANNER | SUPERVISOR | MANAGEMENT |
|----------|-------|---------|------------|-----------|
| Create/Update/Delete Master Data | ✓ | | | |
| Read Master Data | ✓ | ✓ | ✓ | ✓ |
| Create/Update Actual Status | ✓ | ✓ | | |
| Read Actual Status | ✓ | ✓ | ✓ | ✓ |
| Create/Update Forecast | ✓ | ✓ | | |
| Read Forecast | ✓ | ✓ | ✓ | ✓ |
| Read KPI | ✓ | ✓ | ✓ | ✓ |
| Calculate & Save KPI | ✓ | | ✓ | |

---

## Health Check
```
GET /api/health
```
Returns server status and timestamp.

---

## Response Format
All successful responses:
```json
{
  "success": true,
  "message": "Operation description",
  "data": { }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

---

## Testing
Run provided test scripts:
```bash
# Basic endpoint test
powershell -ExecutionPolicy Bypass -File test-api.ps1

# New endpoints test
powershell -ExecutionPolicy Bypass -File test-new-endpoints.ps1
```
