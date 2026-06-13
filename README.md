# Full-Stack App: MongoDB + Express + Next.js

Aplikasi full-stack modern dengan MongoDB, Express API, dan Next.js frontend.

## 📋 Struktur Project

```
.
├── backend/              # Express API Server
│   ├── src/
│   │   └── app.ts       # Main API application
│   ├── Dockerfile       # Backend container config
│   ├── package.json     # Dependencies
│   └── .env             # Environment variables
├── frontend/            # Next.js Application
│   ├── src/
│   │   └── app/         # Next.js pages & components
│   ├── package.json
│   └── .env.local       # Frontend environment
├── docker-compose.yml   # Container orchestration
└── package.json         # Root workspace config
```

## 🚀 Cara Menjalankan

### Opsi 1: Local Development (Recommended)

**Prerequisites:**

- Node.js v18+
- MongoDB running locally di `localhost:27017`

**Backend:**

```bash
cd backend
npm install
npm run dev
# Runs at http://localhost:3000
```

**Frontend (Terminal baru):**

```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:3000 (Next.js)
```

### Opsi 2: Docker (Production-like)

```bash
# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

**Services:**

- Backend API: `http://localhost:3000`
- MongoDB: `localhost:27017`
- Frontend: `http://localhost:3000` (melalui Next.js)

## 🛠️ Environment Variables

### Backend (.env atau docker-compose)

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/kontakdb1
NODE_ENV=development
```

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 📡 API Endpoints

| Method | Endpoint          | Description        |
| ------ | ----------------- | ------------------ |
| GET    | `/api/health`     | Health check       |
| GET    | `/api/kontak`     | Get all contacts   |
| GET    | `/api/kontak/:id` | Get single contact |
| POST   | `/api/kontak`     | Create contact     |
| PUT    | `/api/kontak/:id` | Update contact     |
| DELETE | `/api/kontak/:id` | Delete contact     |

**Request Body (POST/PUT):**

```json
{
  "nama": "John Doe",
  "umur": 25
}
```

## 🔍 Troubleshooting

### MongoDB Connection Error

- Pastikan MongoDB berjalan: `mongosh`
- Check `MONGO_URI` di `.env`
- Untuk Docker: `docker-compose logs mongodb`

### Port Already in Use

- Port 3000: `lsof -ti:3000 | xargs kill -9`
- Port 27017: `lsof -ti:27017 | xargs kill -9`

### Frontend CORS Error

- Backend CORS sudah dikonfigurasi untuk port 3000 & 3001
- Check `process.env.NEXT_PUBLIC_API_URL` di frontend

## 📦 Scripts

```bash
# Development
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only
npm run dev              # Start both (background)

# Docker
npm run docker:up        # Start containers
npm run docker:down      # Stop containers
npm run docker:logs      # View container logs
```

## 🎯 Fixes Applied

✅ Added MongoDB service ke docker-compose  
✅ Fixed CORS untuk localhost:3000 & :3001  
✅ Added .env configuration untuk backend  
✅ Fixed docker-compose port mapping  
✅ Created root tsconfig.json untuk mono-repo  
✅ Updated root package.json dengan scripts  
✅ Added Dockerfile improvements dengan health check  
✅ Added .env.local untuk frontend

## 📚 Tech Stack

- **Backend:** Express, TypeScript, Mongoose, Zod
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Database:** MongoDB
- **Containerization:** Docker, Docker Compose

## 👨‍💻 Author

Adam Wahyu Kurniawan

---

**Ready to run!** 🎉
