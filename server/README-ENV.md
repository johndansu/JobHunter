# Environment Variables for Railway

Set these in Railway Dashboard → Variables:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...  # Auto-set by Railway when you add PostgreSQL
JWT_SECRET=your-random-secret-key-min-32-characters
PORT=5000
CORS_ORIGIN=https://your-vercel-app.vercel.app
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

## Required Variables:
- `NODE_ENV` - Set to "production"
- `DATABASE_URL` - Automatically configured when PostgreSQL is added
- `JWT_SECRET` - Generate a secure random string
- `PORT` - 5000 (Railway will override if needed)
- `CORS_ORIGIN` - Your frontend URL

## Optional Variables:
- `PUPPETEER_ARGS` - Additional Puppeteer launch arguments
- Job API keys (if using external APIs)

