# VOR Backend API Documentation - Phase 3

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

Response includes token and user data (valid 7 days).

---

## 2. User Management Endpoints (Admin)

### GET /users/me
Get current logged-in user profile
```
Authorization: Bearer <token>
```
Returns: User ID, name, email, role, branch, created date

### PUT /users/me/profile
Update own profile
```json
{
  "name": "New Name",
  "email": "newemail@example.com",
  "cabang": "Jakarta"
}
```

### POST /users/me/change-password
Change own password
```json
{
  "currentPassword": "password123",
  "newPassword": "newpassword456"
}
```

### GET /users
List all users (ADMIN only)
Returns all users with count

### GET /users/by-role?role=PLANNER
Get users by specific role (ADMIN only)
Filters users by role (ADMIN, PLANNER, SUPERVISOR, MANAGEMENT)

### GET /users/:id
Get user by ID (ADMIN only)

### POST /users
Create new user (ADMIN only)
```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "password123",
  "role": "PLANNER",
  "cabang": "Jakarta"
}
```

### PUT /users/:id
Update user details (ADMIN only)
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "role": "SUPERVISOR",
  "cabang": "Bandung"
}
```

### DELETE /users/:id
Delete user by ID (ADMIN only)
Cannot delete your own account

---

## 3. Master Data Endpoints

### Vehicles
- `GET /vehicles` - Get all vehicles
- `GET /vehicles/:id` - Get vehicle by ID
- `POST /vehicles` - Create vehicle (ADMIN only)
- `PUT /vehicles/:id` - Update vehicle (ADMIN only)
- `DELETE /vehicles/:id` - Delete vehicle (ADMIN only)

Includes: nopol (unique), type, tonnage, kubikasi, owner, driver

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

Status codes: OPERASI, PERBAIKAN, SERVIS, INSPEKSI, SIAP, TUNGGU, BOOKING, TIDAK ADA, etc.

---

## 4. Operational Data Endpoints

### Actual Status (PLANNER tracks daily status)
Tracks real vehicle status for each day
- `GET /actual-status/:id` - Get actual status by ID
- `GET /actual-status/vehicle/:vehicleId?startDate=2026-01-01&endDate=2026-01-31` - Date range query
- `POST /actual-status` - Create actual status (PLANNER/ADMIN)
  ```json
  {
    "vehicleId": "vehicle-id",
    "date": "2026-01-15T00:00:00Z",
    "statusCode": "OPERASI",
    "notes": "Optional notes"
  }
  ```
- `PUT /actual-status/:id` - Update actual status (PLANNER/ADMIN)
  ```json
  {
    "statusCode": "PERBAIKAN",
    "notes": "Under repair"
  }
  ```
- `DELETE /actual-status/:id` - Delete actual status (ADMIN only)
- `POST /actual-status/bulk/update` - Bulk update statuses (PLANNER/ADMIN)
  ```json
  {
    "updates": [
      { "vehicleId": "v1", "date": "2026-01-15", "statusCode": "OPERASI" },
      { "vehicleId": "v2", "date": "2026-01-15", "statusCode": "PERBAIKAN" }
    ]
  }
  ```

### Forecast Status (PLANNER predicts future status)
Predicts vehicle status with confidence level
- `GET /forecast/:id` - Get forecast status by ID
- `GET /forecast/vehicle/:vehicleId?startDate=2026-01-01&endDate=2026-02-28` - Date range query
- `POST /forecast` - Create forecast (PLANNER/ADMIN)
  ```json
  {
    "vehicleId": "vehicle-id",
    "date": "2026-02-15T00:00:00Z",
    "statusCode": "OPERASI",
    "confidence": 75,
    "notes": "Expected operational"
  }
  ```
- `PUT /forecast/:id` - Update forecast (PLANNER/ADMIN)
- `DELETE /forecast/:id` - Delete forecast (ADMIN only)
- `POST /forecast/bulk/update` - Bulk update forecasts

---

## 5. Revenue Data Endpoints (NEW - Phase 3)

Track daily revenue, expenses, and profit by vehicle

### GET /revenue/:id
Get revenue data by ID

### GET /revenue/vehicle/:vehicleId?startDate=2026-01-01&endDate=2026-01-31
Query revenue by vehicle and date range
Returns: records array + totals (revenue, expenses, profit)

### GET /revenue/summary?startDate=2026-01-01&endDate=2026-01-31
Get revenue summary across all vehicles
Returns:
```json
{
  "totalTrips": 150,
  "totalRevenue": 5000000,
  "totalFuelExpense": 1500000,
  "totalOtherExpense": 300000,
  "totalProfit": 3200000,
  "avgRevenuePerTrip": 33333.33,
  "avgProfitPerTrip": 21333.33
}
```

### POST /revenue
Create revenue entry (PLANNER/ADMIN)
```json
{
  "vehicleId": "vehicle-id",
  "date": "2026-01-15T00:00:00Z",
  "tripCount": 8,
  "totalRevenue": 400000,
  "fuelExpense": 150000,
  "otherExpense": 20000,
  "notes": "Good day"
}
```
Profit auto-calculated: revenue - (fuel + other)

### PUT /revenue/:id
Update revenue entry (PLANNER/ADMIN)
```json
{
  "tripCount": 9,
  "totalRevenue": 450000,
  "fuelExpense": 160000,
  "otherExpense": 25000
}
```

### DELETE /revenue/:id
Delete revenue entry (ADMIN only)

### POST /revenue/bulk/update
Bulk update revenue (PLANNER/ADMIN)
```json
{
  "updates": [
    {
      "vehicleId": "v1",
      "date": "2026-01-15",
      "tripCount": 8,
      "totalRevenue": 400000,
      "fuelExpense": 150000,
      "otherExpense": 20000
    }
  ]
}
```

---

## 6. Forecast Deviation Endpoints (NEW - Phase 3)

Track accuracy of forecast vs actual status

### GET /forecast-deviation/:id
Get deviation record by ID

### GET /forecast-deviation/vehicle/:vehicleId?startDate=2026-01-01&endDate=2026-01-31
Query deviations by vehicle and date range
Returns:
```json
{
  "records": [...],
  "summary": {
    "totalRecords": 10,
    "accurateRecords": 8,
    "deviatedRecords": 2,
    "accuracy": 80.00
  }
}
```

### GET /forecast-deviation/accuracy-report?startDate=2026-01-01&endDate=2026-01-31
Get overall accuracy report (all vehicles)
Returns:
```json
{
  "overall": {
    "totalRecords": 100,
    "accurateRecords": 85,
    "deviatedRecords": 15,
    "accuracy": 85.00
  },
  "byVehicle": [
    {
      "vehicleId": "v1",
      "nopol": "B123CD",
      "total": 20,
      "accurate": 18,
      "deviated": 2,
      "accuracy": 90.00
    }
  ],
  "dateRange": { "startDate": "...", "endDate": "..." }
}
```

### POST /forecast-deviation
Record deviation/accuracy (SUPERVISOR/ADMIN)
```json
{
  "vehicleId": "vehicle-id",
  "date": "2026-01-15T00:00:00Z",
  "forecastStatusCode": "OPERASI",
  "actualStatusCode": "PERBAIKAN",
  "deviationNotes": "Unexpected breakdown"
}
```
isDeviated auto-set: true if forecast != actual

---

## 7. KPI Calculation Endpoints

### GET /kpi/daily?date=2026-01-15
Get or calculate daily KPI
Returns KPA, UA, PA percentages
- Cached if exists in DB, otherwise calculates on-the-fly

### POST /kpi/daily/calculate
Force calculate and save daily KPI (SUPERVISOR/ADMIN)
```json
{
  "date": "2026-01-15"
}
```

### GET /kpi/weekly?startDate=2026-01-12
Get or calculate weekly KPI (7-day average)

### POST /kpi/weekly/calculate
Calculate and save weekly KPI (SUPERVISOR/ADMIN)

### GET /kpi/monthly?year=2026&month=1
Get or calculate monthly KPI

### POST /kpi/monthly/calculate
Calculate and save monthly KPI (SUPERVISOR/ADMIN)

#### KPI Metrics
- **KPA** (Equipment Productivity Availability) = Available / Total × 100
- **UA** (Equipment Utilization Availability) = Utilized / Available × 100
- **PA** (Overall Productivity Availability) = Productive / Total × 100

Status Grouping:
- Available: SIAP, TUNGGU
- Utilized: OPERASI
- Productive: OPERASI, BOOKING
- Downtime: PERBAIKAN, SERVIS, INSPEKSI

---

## Role-Based Access Control Matrix

| Endpoint | ADMIN | PLANNER | SUPERVISOR | MANAGEMENT |
|----------|-------|---------|------------|-----------|
| **User Management** | | | | |
| Users CRUD | ✓ | | | |
| Current Profile | ✓ | ✓ | ✓ | ✓ |
| **Master Data** | | | | |
| Vehicles/Drivers/Customers CRUD | ✓ | | | |
| Read Master Data | ✓ | ✓ | ✓ | ✓ |
| **Operational Data** | | | | |
| Actual Status Create/Update | ✓ | ✓ | | |
| Actual Status Delete | ✓ | | | |
| Forecast Create/Update | ✓ | ✓ | | |
| Forecast Delete | ✓ | | | |
| **Revenue & Deviation** | | | | |
| Revenue Create/Update | ✓ | ✓ | | |
| Revenue Delete | ✓ | | | |
| Record Deviation | ✓ | | ✓ | |
| **KPI** | | | | |
| View KPI | ✓ | ✓ | ✓ | ✓ |
| Calculate & Save KPI | ✓ | | ✓ | |

---

## Health Check
```
GET /api/health
```
Returns server status and timestamp.

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation description",
  "data": { },
  "count": 10
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

### Common HTTP Status Codes
- `200` - Success (GET, PUT, POST successful)
- `201` - Created (POST successful, resource created)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate entry)
- `500` - Server Error

---

## Testing
Run provided test scripts:
```bash
# Phase 2 endpoints
powershell -ExecutionPolicy Bypass -File test-api.ps1

# Phase 2 new endpoints
powershell -ExecutionPolicy Bypass -File test-new-endpoints.ps1

# Phase 3 endpoints
powershell -ExecutionPolicy Bypass -File test-phase3.ps1
```

---

## Total Endpoints Summary (Phase 3 Complete)
- **2** Authentication endpoints
- **10** User management endpoints
- **15** Master data endpoints (vehicles, drivers, customers)
- **15** Operational endpoints (actual + forecast status)
- **6** Revenue endpoints
- **4** Forecast deviation endpoints
- **6** KPI calculation endpoints
- **1** Health check

**Total: 59 API endpoints**, all tested and working ✓

---

## Database Models Used
- User (admin, planner, supervisor, management roles)
- Vehicle, Driver, Customer (master data)
- MasterStatus (11 seeded statuses)
- ActualStatus, ForecastStatus (daily operational tracking)
- RevenueData (financial tracking)
- ForecastDeviation (accuracy tracking)
- DailyKPI, WeeklyKPI, MonthlyKPI (performance metrics)
- AuditLog (operational tracking)

---

## Environment Variables Required
```
DATABASE_URL=postgresql://user:password@localhost:5432/vor_db
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key (auto-generated)
JWT_EXPIRY=7d
```

---

## Next Steps (Phase 4)
1. Dashboard/Reporting endpoints
2. Export to PDF/Excel functionality
3. Frontend integration (VOR-Frontend)
4. Production deployment
5. Performance optimization
