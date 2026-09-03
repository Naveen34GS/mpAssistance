# Personal Management Web Application

A modern, secure, full-stack personal management dashboard built with React, Node.js, and Supabase. Features notes, events, documents, and a highly secure personal web credentials (PWS) manager.

## Features

- **Dashboard**: View today's events and quick stats.
- **Notes**: Create and manage text notes.
- **Events**: Schedule and manage daily events.
- **Documents**: Upload and securely store personal files (via Supabase Storage).
- **PWS (Password Management)**: Securely store credentials with a secondary PIN protection layer. Passwords are encrypted on the server side using AES-256-GCM.
- **Finance Manager**: Placeholder module ready for future expansion.

## Architecture & Security

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Zustand, React Router.
- **Backend**: Node.js, Express, TypeScript, REST API architecture.
- **Database**: Supabase PostgreSQL with Row Level Security (RLS) to enforce data ownership.
- **Authentication**: Supabase Auth (JWT verified by the backend).
- **PWS Security**:
  - The secret PIN is never stored in plaintext. It is hashed with `bcrypt`.
  - Passwords are encrypted in the database using a server-side `ENCRYPTION_KEY`.
  - Revealing a password requires the user to first verify their PIN, which creates a short-lived (10-minute) `httpOnly` cookie session.
  - The frontend automatically masks revealed passwords after 30 seconds.

## Setup Instructions

### 1. Supabase Configuration

1. Create a new [Supabase](https://supabase.com/) project.
2. Go to SQL Editor and run the migration file found in `supabase/migrations/20260903000000_initial_schema.sql`.
3. Go to **Storage** and create a new bucket named `documents`.
   - Set the bucket to **Private** (do not allow public access).
4. Go to **Authentication** -> **Providers** and configure your preferred sign-in methods (Email/Password is enabled by default).
5. (Optional but recommended) Disable "Allow new users to sign up" in Supabase Auth settings after you create your personal account, to keep the application private.

### 2. Environment Variables

Create `.env` files in both the `client` and `server` directories based on the provided `.env.example` file in the root.

**Client (`client/.env`)**:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000/api
```

**Server (`server/.env`)**:
```env
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Generate a strong 32-byte hex string (e.g., using `openssl rand -hex 32`)
ENCRYPTION_KEY=your_32_byte_hex_encryption_key

# Used for the short-lived PIN session token
JWT_SECRET=your_jwt_secret_for_pin_sessions
```

### 3. Installation

Run the following command in both `client` and `server` directories:

```bash
npm install
```

### 4. Running Locally

**Start the Backend API**:
```bash
cd server
npm run dev
```

**Start the Frontend Client**:
```bash
cd client
npm run dev
```

The client will typically run on `http://localhost:5173` and the server on `http://localhost:5000`.

### 5. Production Build

To build the frontend for production:
```bash
cd client
npm run build
```

To build the backend for production:
```bash
cd server
npm run build
npm start
```
