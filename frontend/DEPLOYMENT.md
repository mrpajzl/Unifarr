# Unifarr Frontend - Deployment Guide

## 🚀 Quick Deploy

### Development
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env if backend is not on localhost:3000

# 3. Start dev server
npm run dev
```

### Production

#### Option 1: Node.js Server
```bash
# 1. Build the application
npm run build

# 2. Start production server
npm run preview

# Or use PM2 for process management
pm2 start "npm run preview" --name unifarr-frontend
```

#### Option 2: Static Site (if using SSG)
```bash
# 1. Generate static files
npm run generate

# 2. Serve the .output/public folder
# Using any static file server (nginx, Apache, Vercel, Netlify, etc.)
```

#### Option 3: Docker
```bash
# Build Docker image
docker build -t unifarr-frontend .

# Run container
docker run -p 3000:3000 -e NUXT_PUBLIC_API_BASE=http://backend:3000 unifarr-frontend
```

**Dockerfile:**
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NUXT_PUBLIC_API_BASE` | `http://localhost:3000` | Backend API URL |
| `PORT` | `3000` | Frontend port (optional) |

### Backend Integration

Ensure your backend API:
1. **Runs and is accessible** at the configured URL
2. **Has CORS enabled** for the frontend domain
3. **Has TMDB API key** configured
4. **Has qBittorrent** connected (for downloads)

## 📦 Hosting Options

### Vercel (Recommended)
1. Connect GitHub repository
2. Set `NUXT_PUBLIC_API_BASE` environment variable
3. Deploy automatically on push

### Netlify
1. Build command: `npm run generate`
2. Publish directory: `.output/public`
3. Set environment variables

### Docker + VPS
```bash
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - TMDB_API_KEY=your_key
      - QBITTORRENT_URL=http://qbittorrent:8080
    volumes:
      - ./data:/app/data

  frontend:
    build: ./frontend
    ports:
      - "80:3000"
    environment:
      - NUXT_PUBLIC_API_BASE=http://backend:3000
    depends_on:
      - backend

  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    ports:
      - "8080:8080"
      - "6881:6881"
    volumes:
      - ./downloads:/downloads
```

### Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name unifarr.example.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

## 🔒 Security

### Production Checklist
- [ ] Change default API URL
- [ ] Enable HTTPS (Let's Encrypt)
- [ ] Set up firewall rules
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting on backend
- [ ] Regular security updates

### Best Practices
1. **Never commit `.env` files**
2. **Use HTTPS in production**
3. **Keep dependencies updated**
4. **Monitor error logs**
5. **Set up proper CORS**

## 📊 Performance

### Optimization Tips
1. **Enable compression** (gzip/brotli)
2. **Use CDN** for static assets
3. **Cache API responses** (if applicable)
4. **Optimize images** (already lazy-loaded)
5. **Enable HTTP/2**

### Caching Strategy
```nginx
# Static assets - cache 1 year
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML - no cache
location ~* \.html$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

## 🔍 Monitoring

### Health Checks
```bash
# Frontend health
curl http://localhost:3000/

# Backend health
curl http://localhost:3000/api/health
```

### Logging
```bash
# PM2 logs
pm2 logs unifarr-frontend

# Docker logs
docker logs unifarr-frontend

# Access logs
tail -f /var/log/nginx/access.log
```

## 🔄 Updates

### Zero-Downtime Deployment
```bash
# Using PM2
pm2 reload unifarr-frontend

# Using Docker
docker-compose up -d --no-deps --build frontend
```

### Rollback
```bash
# PM2
pm2 restart unifarr-frontend --update-env

# Docker
docker-compose down
docker-compose up -d
```

## 🐛 Troubleshooting

### Build Fails
```bash
# Clear cache
rm -rf node_modules .nuxt .output
npm install
npm run build
```

### API Connection Issues
1. Check `.env` has correct `NUXT_PUBLIC_API_BASE`
2. Verify backend is running
3. Check CORS configuration
4. Inspect browser console for errors

### Port Already in Use
```bash
# Change port
PORT=3001 npm run dev
```

### Performance Issues
1. Check backend response times
2. Enable production mode
3. Use CDN for images
4. Optimize database queries (backend)

## 📝 Maintenance

### Regular Tasks
- **Weekly:** Check logs for errors
- **Monthly:** Update dependencies
- **Quarterly:** Security audit
- **Yearly:** Review and optimize

### Backup
```bash
# Backup frontend config
tar -czf frontend-backup.tar.gz .env nuxt.config.ts

# Restore
tar -xzf frontend-backup.tar.gz
```

## 🎯 Scaling

### Horizontal Scaling
Use a load balancer (nginx, HAProxy) to distribute traffic across multiple frontend instances:

```bash
# Run multiple instances
pm2 start npm --name "unifarr-frontend-1" -- run preview
pm2 start npm --name "unifarr-frontend-2" -- run preview
pm2 start npm --name "unifarr-frontend-3" -- run preview
```

### Vertical Scaling
- Increase Node.js memory: `NODE_OPTIONS=--max_old_space_size=4096`
- Use faster hosting (SSD, better CPU)

---

## 🎉 Success!

Your Unifarr frontend is now deployed and ready to serve your media library! 🎬📺

For support, see the main README or open an issue.
