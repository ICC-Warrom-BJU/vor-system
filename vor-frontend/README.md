# VOR Frontend

Vehicle Operations & Revenue Management System - Frontend

## Prerequisites

- Node.js 18+
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

Update the `VITE_API_URL` to point to your backend API.

## Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Production Build

```bash
npm run build
```

The production build will be in the `dist` directory.

## Preview Production Build

```bash
npm run preview
```

## Deployment

### Static Hosting (Vercel, Netlify, etc.)

1. Run `npm run build`
2. Deploy the `dist` directory
3. Set environment variable `VITE_API_URL` to your production backend URL

### Traditional Hosting

1. Run `npm run build`
2. Serve the `dist` directory using a web server (nginx, apache, etc.)
3. Configure reverse proxy to handle API requests if needed

## Features

- Dashboard with statistics and visualizations
- Master data management (Vehicles, Drivers, Customers)
- Actual Status and Forecast Status tracking
- Revenue data entry
- Search and pagination
- Data validation
- Responsive design

## Technology Stack

- React 18
- TypeScript
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- Lucide Icons
