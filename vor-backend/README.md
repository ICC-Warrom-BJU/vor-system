# VOR Backend

Vehicle Operations & Revenue Management System - Backend

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Update the following variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `PORT`: Server port (default: 3000)
- `CORS_ORIGIN`: Frontend URL for CORS

## Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database with sample data
npm run seed
```

## Development

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## API Endpoints

### Authentication
- POST `/api/auth/login` - User login
- POST `/api/auth/register` - User registration

### Master Data
- GET `/api/vehicles` - List all vehicles
- POST `/api/vehicles` - Create vehicle
- PUT `/api/vehicles/:id` - Update vehicle
- DELETE `/api/vehicles/:id` - Delete vehicle

- GET `/api/drivers` - List all drivers
- POST `/api/drivers` - Create driver
- PUT `/api/drivers/:id` - Update driver
- DELETE `/api/drivers/:id` - Delete driver

- GET `/api/customers` - List all customers
- POST `/api/customers` - Create customer
- PUT `/api/customers/:id` - Update customer
- DELETE `/api/customers/:id` - Delete customer

### Operational Data
- GET `/api/actual-status/date?date=` - Get actual status by date
- POST `/api/actual-status/bulk/update` - Bulk update actual status

- GET `/api/forecast-status/date?date=` - Get forecast status by date
- POST `/api/forecast-status/bulk/update` - Bulk update forecast status

- GET `/api/revenue-data/date?date=` - Get revenue data by date
- POST `/api/revenue-data` - Create revenue data

### Dashboard
- GET `/api/dashboard/fleet-overview` - Fleet overview statistics
- GET `/api/dashboard/revenue?startDate=&endDate=` - Revenue dashboard

### Reports
- GET `/api/reports/daily?date=` - Daily report
- GET `/api/reports/weekly?startDate=&endDate=` - Weekly report
- GET `/api/reports/monthly?month=&year=` - Monthly report

## Technology Stack

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
