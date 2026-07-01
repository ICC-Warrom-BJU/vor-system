# VOR Backend Phase 4 API Documentation
## Dashboard, Reporting & Export Endpoints

**Phase 4 Status**: Complete ✓
**Total Phase 4 Endpoints**: 17
**Total System Endpoints**: 76 (Phase 1-4)
**Authorization**: All Phase 4 endpoints require JWT token (Bearer token)

---

## Table of Contents
1. [Dashboard Endpoints](#dashboard-endpoints)
2. [Reporting Endpoints](#reporting-endpoints)
3. [Export Endpoints](#export-endpoints)
4. [Response Format](#response-format)
5. [Error Handling](#error-handling)

---

## Dashboard Endpoints

Dashboard endpoints provide real-time aggregate data for visualization and monitoring.

### 1. Get Fleet Overview

**Endpoint:** `GET /api/dashboard/fleet-overview`

**Description:** Get current fleet status overview with status distribution.

**Parameters:**
- `date` (optional, query): Date to check status (YYYY-MM-DD format). Defaults to today.

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dashboard/fleet-overview?date=2026-06-04"
```

**Response:**
```json
{
  "success": true,
  "message": "Fleet overview berhasil diambil",
  "data": {
    "date": "2026-06-04",
    "totalVehicles": 50,
    "operational": {
      "count": 35,
      "percentage": 70
    },
    "standby": {
      "count": 10,
      "percentage": 20
    },
    "maintenance": {
      "count": 3,
      "percentage": 6
    },
    "unknown": {
      "count": 2,
      "percentage": 4
    },
    "statusDistribution": [
      {
        "code": "OPERASI",
        "count": 35,
        "percentage": 70
      },
      {
        "code": "SIAP",
        "count": 8,
        "percentage": 16
      }
    ]
  }
}
```

---

### 2. Get Revenue Dashboard

**Endpoint:** `GET /api/dashboard/revenue`

**Description:** Revenue summary with trend analysis and top performers.

**Parameters:**
- `startDate` (required, query): Start date (YYYY-MM-DD)
- `endDate` (required, query): End date (YYYY-MM-DD)

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dashboard/revenue?startDate=2026-05-28&endDate=2026-06-04"
```

**Response:**
```json
{
  "success": true,
  "message": "Revenue dashboard berhasil diambil",
  "data": {
    "dateRange": {
      "startDate": "2026-05-28",
      "endDate": "2026-06-04"
    },
    "totals": {
      "totalTrips": 450,
      "totalRevenue": 45000000,
      "totalExpense": 12000000,
      "totalProfit": 33000000
    },
    "avgDaily": {
      "revenue": 5625000,
      "expense": 1500000,
      "profit": 4125000
    },
    "trend": [
      {
        "date": "2026-05-28",
        "revenue": 5000000,
        "expense": 1200000,
        "profit": 3800000,
        "trips": 50
      }
    ],
    "topPerformers": [
      {
        "nopol": "BL 1234 XYZ",
        "trips": 60,
        "revenue": 6000000,
        "profit": 4500000
      }
    ]
  }
}
```

---

### 3. Get KPI Dashboard

**Endpoint:** `GET /api/dashboard/kpi`

**Description:** KPI metrics summary with trend analysis.

**Parameters:**
- `startDate` (required, query): Start date (YYYY-MM-DD)
- `endDate` (required, query): End date (YYYY-MM-DD)

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dashboard/kpi?startDate=2026-05-28&endDate=2026-06-04"
```

**Response:**
```json
{
  "success": true,
  "message": "KPI dashboard berhasil diambil",
  "data": {
    "dateRange": {
      "startDate": "2026-05-28",
      "endDate": "2026-06-04"
    },
    "summary": {
      "KPA": {
        "avg": 82.5,
        "min": 75.0,
        "max": 90.0
      },
      "UA": {
        "avg": 65.3,
        "min": 55.0,
        "max": 75.0
      },
      "PA": {
        "avg": 58.2,
        "min": 48.0,
        "max": 68.0
      }
    },
    "trend": [
      {
        "date": "2026-05-28",
        "KPA": 85.0,
        "UA": 68.0,
        "PA": 60.0,
        "available": 42,
        "utilized": 28,
        "productive": 24
      }
    ],
    "recordCount": 8
  }
}
```

---

### 4. Get Forecast Accuracy Dashboard

**Endpoint:** `GET /api/dashboard/forecast-accuracy`

**Description:** Forecast prediction accuracy metrics.

**Parameters:**
- `startDate` (required, query): Start date (YYYY-MM-DD)
- `endDate` (required, query): End date (YYYY-MM-DD)

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dashboard/forecast-accuracy?startDate=2026-05-28&endDate=2026-06-04"
```

**Response:**
```json
{
  "success": true,
  "message": "Forecast accuracy dashboard berhasil diambil",
  "data": {
    "dateRange": {
      "startDate": "2026-05-28",
      "endDate": "2026-06-04"
    },
    "overall": {
      "total": 400,
      "accurate": 340,
      "deviated": 60,
      "accuracy": 85.0
    },
    "byVehicle": [
      {
        "nopol": "BL 1234 XYZ",
        "total": 8,
        "accurate": 7,
        "accuracy": 87.5
      }
    ],
    "trend": [
      {
        "date": "2026-05-28",
        "total": 50,
        "accurate": 43,
        "accuracy": 86.0
      }
    ]
  }
}
```

---

### 5. Get Operational Metrics

**Endpoint:** `GET /api/dashboard/operational-metrics`

**Description:** Operational status distribution metrics.

**Parameters:**
- `startDate` (required, query): Start date (YYYY-MM-DD)
- `endDate` (required, query): End date (YYYY-MM-DD)

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dashboard/operational-metrics?startDate=2026-05-28&endDate=2026-06-04"
```

**Response:**
```json
{
  "success": true,
  "message": "Operational metrics berhasil diambil",
  "data": {
    "dateRange": {
      "startDate": "2026-05-28",
      "endDate": "2026-06-04"
    },
    "totalRecords": 400,
    "statusDistribution": [
      {
        "code": "OPERASI",
        "count": 280,
        "percentage": 70.0
      },
      {
        "code": "SIAP",
        "count": 80,
        "percentage": 20.0
      }
    ]
  }
}
```

---

## Reporting Endpoints

Detailed analysis and performance reporting with breakdown by vehicle and time period.

### 6. Get Vehicle Performance Report

**Endpoint:** `GET /api/reports/vehicle-performance`

**Description:** Detailed performance metrics per vehicle.

**Parameters:**
- `startDate` (required, query): Start date (YYYY-MM-DD)
- `endDate` (required, query): End date (YYYY-MM-DD)
- `sortBy` (optional, query): Sort field - `profit`, `trips`, `kpa`, `accuracy`, `revenue` (default: profit)

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/reports/vehicle-performance?startDate=2026-05-28&endDate=2026-06-04&sortBy=profit"
```

**Response:**
```json
{
  "success": true,
  "message": "Vehicle performance report berhasil diambil",
  "data": {
    "dateRange": {
      "startDate": "2026-05-28",
      "endDate": "2026-06-04"
    },
    "sortedBy": "profit",
    "totalVehicles": 50,
    "report": [
      {
        "vehicleId": "1",
        "nopol": "BL 1234 XYZ",
        "type": "Tronton",
        "driver": "John Doe",
        "branch": "Jakarta",
        "metrics": {
          "totalTrips": 60,
          "totalRevenue": 6000000,
          "totalExpense": 1400000,
          "totalProfit": 4600000,
          "profitMargin": 76.67
        },
        "kpi": {
          "KPA": 88.5,
          "UA": 72.3,
          "PA": 65.2
        },
        "forecast": {
          "accuracy": 87.5,
          "totalRecords": 8
        }
      }
    ]
  }
}
```

---

### 7. Get Revenue Analysis

**Endpoint:** `GET /api/reports/revenue-analysis`

**Description:** Revenue breakdown by time period with trend analysis.

**Parameters:**
- `startDate` (required, query): Start date (YYYY-MM-DD)
- `endDate` (required, query): End date (YYYY-MM-DD)
- `groupBy` (optional, query): Group by period - `day`, `week`, `month` (default: day)

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/reports/revenue-analysis?startDate=2026-05-28&endDate=2026-06-04&groupBy=day"
```

**Response:**
```json
{
  "success": true,
  "message": "Revenue analysis berhasil diambil",
  "data": {
    "dateRange": {
      "startDate": "2026-05-28",
      "endDate": "2026-06-04"
    },
    "groupedBy": "day",
    "totals": {
      "totalTrips": 450,
      "totalRevenue": 45000000,
      "totalFuel": 10000000,
      "totalOther": 2000000,
      "totalProfit": 33000000,
      "avgRevenuePerTrip": 100000,
      "profitMargin": 73.33
    },
    "analysis": [
      {
        "period": "2026-05-28",
        "trips": 50,
        "revenue": 5000000,
        "fuel": 1200000,
        "other": 200000,
        "profit": 3600000,
        "avgRevenuePerTrip": 100000,
        "profitMargin": 72.0
      }
    ]
  }
}
```

---

### 8. Get KPI Trend Report

**Endpoint:** `GET /api/reports/kpi-trend`

**Description:** KPI trends across daily, weekly, and monthly views.

**Parameters:**
- `startDate` (required, query): Start date (YYYY-MM-DD)
- `endDate` (required, query): End date (YYYY-MM-DD)

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/reports/kpi-trend?startDate=2026-05-28&endDate=2026-06-04"
```

**Response:**
```json
{
  "success": true,
  "message": "KPI trend report berhasil diambil",
  "data": {
    "dateRange": {
      "startDate": "2026-05-28",
      "endDate": "2026-06-04"
    },
    "daily": {
      "count": 8,
      "trend": [
        {
          "date": "2026-05-28",
          "KPA": 85.0,
          "UA": 68.0,
          "PA": 60.0
        }
      ]
    },
    "weekly": {
      "count": 2,
      "trend": [
        {
          "weekStart": "2026-05-26",
          "KPA": 83.5,
          "UA": 66.8,
          "PA": 59.3
        }
      ]
    },
    "monthly": {
      "count": 1,
      "trend": [
        {
          "month": "2026-06-01",
          "KPA": 82.0,
          "UA": 65.2,
          "PA": 57.8
        }
      ]
    }
  }
}
```

---

### 9. Get Compliance Report

**Endpoint:** `GET /api/reports/compliance`

**Description:** Data reporting compliance by vehicle.

**Parameters:**
- `startDate` (required, query): Start date (YYYY-MM-DD)
- `endDate` (required, query): End date (YYYY-MM-DD)

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/reports/compliance?startDate=2026-05-28&endDate=2026-06-04"
```

**Response:**
```json
{
  "success": true,
  "message": "Compliance report berhasil diambil",
  "data": {
    "dateRange": {
      "startDate": "2026-05-28",
      "endDate": "2026-06-04"
    },
    "summary": {
      "totalVehicles": 50,
      "compliant": 45,
      "partialCompliance": 4,
      "nonCompliant": 1
    },
    "details": [
      {
        "vehicleId": "2",
        "nopol": "BL 9999 ZZZ",
        "totalDays": 8,
        "reportedDays": 4,
        "compliance": 50.0,
        "missingDays": 4
      }
    ]
  }
}
```

---

## Export Endpoints

Export data in various formats (CSV, HTML) for offline use and further analysis.

### 10. Export Revenue Report

**Endpoint:** `GET /api/export/revenue`

**Description:** Export revenue data to CSV or HTML format.

**Parameters:**
- `startDate` (required, query): Start date (YYYY-MM-DD)
- `endDate` (required, query): End date (YYYY-MM-DD)
- `format` (optional, query): Format - `csv`, `html` (default: csv)

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/export/revenue?startDate=2026-05-28&endDate=2026-06-04&format=csv" \
  -o revenue-report.csv
```

**Response:** File download (CSV or HTML)

---

### 11. Export KPI Report

**Endpoint:** `GET /api/export/kpi`

**Description:** Export KPI data to CSV or HTML format.

**Parameters:**
- `startDate` (required, query): Start date (YYYY-MM-DD)
- `endDate` (required, query): End date (YYYY-MM-DD)
- `format` (optional, query): Format - `csv`, `html` (default: csv)

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/export/kpi?startDate=2026-05-28&endDate=2026-06-04&format=csv" \
  -o kpi-report.csv
```

---

### 12. Export Vehicle Performance Report

**Endpoint:** `GET /api/export/vehicle-performance`

**Description:** Export vehicle performance data to CSV or HTML format.

**Parameters:**
- `startDate` (required, query): Start date (YYYY-MM-DD)
- `endDate` (required, query): End date (YYYY-MM-DD)
- `format` (optional, query): Format - `csv`, `html` (default: csv)

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/export/vehicle-performance?startDate=2026-05-28&endDate=2026-06-04&format=csv" \
  -o vehicle-performance.csv
```

---

### 13. Export Forecast Accuracy Report

**Endpoint:** `GET /api/export/forecast-accuracy`

**Description:** Export forecast accuracy data to CSV or HTML format.

**Parameters:**
- `startDate` (required, query): Start date (YYYY-MM-DD)
- `endDate` (required, query): End date (YYYY-MM-DD)
- `format` (optional, query): Format - `csv`, `html` (default: csv)

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/export/forecast-accuracy?startDate=2026-05-28&endDate=2026-06-04&format=csv" \
  -o forecast-accuracy.csv
```

---

## Response Format

### Success Response
All successful API responses follow this format:

```json
{
  "success": true,
  "message": "Deskripsi operasi",
  "data": {
    // Endpoint-specific data
  }
}
```

### Error Response
Error responses include HTTP status codes and error details:

```json
{
  "success": false,
  "message": "Deskripsi error"
}
```

**HTTP Status Codes:**
- `200 OK`: Request successful
- `400 Bad Request`: Missing or invalid parameters
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Error Handling

### Common Errors

**Missing Date Range Parameters:**
```json
{
  "success": false,
  "message": "Parameter startDate dan endDate harus diberikan"
}
```

**Invalid Date Range:**
```json
{
  "success": false,
  "message": "startDate harus lebih awal dari endDate"
}
```

**Invalid Export Format:**
```json
{
  "success": false,
  "message": "Format harus csv atau html"
}
```

**Unauthorized Access:**
```json
{
  "success": false,
  "message": "Token tidak valid atau expired"
}
```

---

## Summary Statistics

**Phase 4 Implementation:**
- **5 Dashboard Endpoints**: Real-time fleet and financial overview
- **4 Reporting Endpoints**: Detailed analysis by vehicle and period
- **4 Export Endpoints**: CSV/HTML file downloads

**Total System Endpoints (Phases 1-4): 76**

| Phase | Category | Count | Total |
|-------|----------|-------|-------|
| 1-3 | Previous | 59 | 59 |
| 4 | Dashboard | 5 | 64 |
| 4 | Reporting | 4 | 68 |
| 4 | Export | 4 | 72 |
| 4 | Health Check | 1 | 73 |
| (Total other) | | 3 | 76 |

---

## Usage Examples

### Real-Time Fleet Monitoring
```bash
# Get current fleet status every minute
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/dashboard/fleet-overview"
```

### Daily Management Report
```bash
# Get comprehensive daily report
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/dashboard/revenue?startDate=2026-06-04&endDate=2026-06-04"
```

### Export for Analysis
```bash
# Export weekly revenue for Excel analysis
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/export/revenue?startDate=2026-05-28&endDate=2026-06-04&format=csv" \
  -o weekly-revenue.csv
```

### Performance Comparison
```bash
# Rank vehicles by profitability
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/reports/vehicle-performance?startDate=2026-05-28&endDate=2026-06-04&sortBy=profit"
```

---

**Phase 4 Status**: ✓ Complete
**API Version**: 1.0
**Last Updated**: June 4, 2026
