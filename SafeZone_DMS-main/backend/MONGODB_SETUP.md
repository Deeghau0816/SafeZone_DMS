# SafeZone DMS - MongoDB Setup Guide

## Quick Start (Without MongoDB)

To run the application immediately without MongoDB:

1. Create a `.env` file in the backend directory with:
```env
PORT=5000
NODE_ENV=development
SKIP_MONGODB=true
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

2. Run the application:
```bash
npm start
```

The server will start and show:
```
⚠️ MongoDB connection skipped (SKIP_MONGODB=true)
📝 Note: Database features will be disabled
🚀 Server running at http://localhost:5000
```

## Setting Up MongoDB Later

### Option 1: Local MongoDB Installation

1. **Install MongoDB Community Server:**
   - Windows: Download from https://www.mongodb.com/try/download/community
   - Or use Chocolatey: `choco install mongodb`
   - Or use Docker: `docker run -d -p 27017:27017 --name mongodb mongo:latest`

2. **Start MongoDB:**
   ```bash
   # Windows (if installed as service)
   net start MongoDB
   
   # Or manually
   mongod --dbpath C:\data\db
   ```

3. **Update .env file:**
   ```env
   SKIP_MONGODB=false
   MONGO_URI=mongodb://localhost:27017/safezone
   ```

### Option 2: MongoDB Atlas (Cloud)

1. **Create free account at:** https://www.mongodb.com/atlas
2. **Create a cluster** (free tier available)
3. **Get connection string** and update .env:
   ```env
   SKIP_MONGODB=false
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/safezone
   ```

### Option 3: Docker MongoDB

1. **Run MongoDB in Docker:**
   ```bash
   docker run -d -p 27017:27017 --name safezone-mongo mongo:latest
   ```

2. **Update .env:**
   ```env
   SKIP_MONGODB=false
   MONGO_URI=mongodb://localhost:27017/safezone
   ```

## Features Available Without MongoDB

- ✅ Server starts successfully
- ✅ Health check endpoint (`/health`)
- ✅ File uploads (`/api/uploads/deposit-proof`)
- ✅ Static file serving (`/uploads`)
- ✅ CORS configuration
- ✅ Error handling
- ❌ Database operations (will return 503 errors)

## Testing the Setup

1. **Health Check:**
   ```bash
   curl http://localhost:5000/health
   ```

2. **File Upload Test:**
   ```bash
   curl -X POST -F "file=@test.jpg" http://localhost:5000/api/uploads/deposit-proof
   ```

## Next Steps

Once MongoDB is set up:
1. Change `SKIP_MONGODB=false` in .env
2. Restart the server
3. All database features will be available
4. Test with: `curl http://localhost:5000/health`
