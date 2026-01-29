# GMN Field Service Manager

A professional full-stack field service management application built with React, Express, and Prisma.

## Features

- **Work Orders** - Create, track, and manage work orders with technician assignments
- **Technicians** - Manage technician database with ratings, blacklisting, and performance tracking
- **Proposals** - Generate detailed service proposals with cost calculations
- **Costs** - Track payment requests with approval workflow (Requested → Approved → Paid)
- **Files** - Upload and manage project files (images, PDFs, videos)
- **Calendar** - Schedule events and track work order ETAs
- **Dashboard** - Overview with stats, alerts, and recent activity

## Tech Stack

### Frontend
- React 19 with React Router DOM
- Tailwind CSS for styling
- Lucide React icons
- Vite for development

### Backend
- Node.js with Express
- Prisma ORM with SQLite
- JWT authentication
- Multer for file uploads

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and install frontend dependencies:**
```bash
cd "GMN App"
npm install
```

2. **Install backend dependencies:**
```bash
cd server
npm install
```

3. **Initialize the database:**
```bash
npm run db:push
npm run db:seed
```

4. **Start the development servers:**

Terminal 1 (Backend):
```bash
cd server
npm run dev
```

Terminal 2 (Frontend):
```bash
cd "GMN App"
npm run dev
```

5. **Open http://localhost:5173 in your browser**

### Demo Credentials
- Email: `demo@gmn.com`
- Password: `demo123`

## Project Structure

```
GMN App/
├── src/                    # Frontend source
│   ├── api/               # API client and services
│   ├── components/        # Reusable UI components
│   ├── context/           # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── layout/            # Layout components (Sidebar, Topbar)
│   ├── pages/             # Page components
│   └── app/               # App configuration and routes
├── server/                # Backend source
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── middleware/    # Express middleware
│   │   └── utils/         # Utility functions
│   └── prisma/            # Database schema and migrations
├── docker-compose.yml     # Docker configuration
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/me` - Update profile

### Work Orders
- `GET /api/work-orders` - List work orders
- `POST /api/work-orders` - Create work order
- `GET /api/work-orders/:id` - Get work order
- `PATCH /api/work-orders/:id` - Update work order
- `DELETE /api/work-orders/:id` - Delete work order

### Technicians
- `GET /api/technicians` - List technicians
- `POST /api/technicians` - Create technician
- `GET /api/technicians/:id` - Get technician
- `PATCH /api/technicians/:id` - Update technician
- `DELETE /api/technicians/:id` - Delete technician

### Proposals
- `GET /api/proposals` - List proposals
- `POST /api/proposals` - Create proposal
- `GET /api/proposals/:id` - Get proposal
- `PATCH /api/proposals/:id` - Update proposal
- `DELETE /api/proposals/:id` - Delete proposal

### Costs
- `GET /api/costs` - List costs
- `POST /api/costs` - Request payment
- `PATCH /api/costs/:id` - Update/approve cost
- `DELETE /api/costs/:id` - Delete cost

### Files
- `GET /api/files` - List files
- `POST /api/files` - Upload file
- `PATCH /api/files/:id` - Update file
- `DELETE /api/files/:id` - Delete file

### Calendar
- `GET /api/calendar` - List events
- `POST /api/calendar` - Create event
- `PATCH /api/calendar/:id` - Update event
- `DELETE /api/calendar/:id` - Delete event

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
```

### Backend (server/.env)
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
```

## Docker Support

Run with Docker Compose:
```bash
docker-compose up
```

## License

MIT
