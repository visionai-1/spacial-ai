# Full-Stack Boilerplate Template

A simple full-stack application boilerplate with React frontend and Node.js/Express backend.

## Quick Start

### Run Both Services Concurrently

From the root directory:

```bash
npm run dev
```

This will start:
- **Backend** on `http://localhost:3001`
- **Frontend** on `http://localhost:5173`

### Run Services Separately

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend (in a new terminal):**
```bash
cd frontend
npm run dev
```

## Project Structure

```
temp-ts-project/
├── backend/              # Node.js/Express backend
│   ├── src/
│   │   ├── server.ts    # Express server setup
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── types/       # TypeScript types
│   └── package.json
│
├── frontend/            # React frontend
│   ├── src/
│   │   ├── App.tsx      # Main app component
│   │   ├── App.css      # App styles
│   │   ├── components/  # React components
│   │   └── services/    # API client
│   └── package.json
│
└── package.json         # Root package for concurrent running
```

## API Endpoints

- `GET /health` - Health check
- `GET /api` - API info
- `GET /api/data` - Get data
- `POST /api/data` - Post data

## Technologies

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Vite
- **Development**: Concurrently, Nodemon, Hot reload

## Next Steps

1. Add your data models in `backend/src/types/`
2. Create your API routes in `backend/src/routes/`
3. Build your UI components in `frontend/src/components/`
4. Connect frontend to backend using `frontend/src/services/api.ts`
