# MongoDB Integration Test Configuration

## Current Setup (No MongoDB)
Create .env file with:
```env
SKIP_MONGODB=true
PORT=5000
NODE_ENV=development
```

Result: Server starts, database features disabled

## When MongoDB is Ready
Update .env file with:
```env
SKIP_MONGODB=false
MONGO_URI=mongodb://localhost:27017/safezone
MONGO_DB=safezone
PORT=5000
NODE_ENV=development
```

Result: Server connects to MongoDB, ALL features work!

## What Changes When MongoDB Connects:

### Before (SKIP_MONGODB=true):
- ❌ /victims - returns 503 error
- ❌ /aid - returns 503 error  
- ❌ /damage - returns 503 error
- ❌ /api/shelters - returns 503 error
- ❌ /api/donations - returns 503 error
- ✅ /health - works
- ✅ /uploads - works

### After (SKIP_MONGODB=false + MongoDB running):
- ✅ /victims - full CRUD operations
- ✅ /aid - full CRUD operations
- ✅ /damage - full CRUD operations  
- ✅ /api/shelters - full CRUD operations
- ✅ /api/donations - full CRUD operations
- ✅ /health - shows MongoDB status
- ✅ /uploads - works with database storage

## Test Commands:

### Test without MongoDB:
```bash
curl http://localhost:5000/health
# Returns: {"ok":true,"service":"backend",...,"mongodb":{"connected":false}}

curl http://localhost:5000/victims
# Returns: {"ok":false,"message":"Database connection unavailable..."}
```

### Test with MongoDB:
```bash
curl http://localhost:5000/health  
# Returns: {"ok":true,"service":"backend",...,"mongodb":{"connected":true}}

curl http://localhost:5000/victims
# Returns: [] (empty array) or victim data if any exists
```

## The Magic:
The same codebase works both ways! Just change the .env configuration.
