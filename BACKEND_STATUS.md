# Check process status
pm2 status

# View logs
pm2 logs backend --lines 50

# Restart
pm2 restart backend

# Stop and delete
pm2 stop backend
pm2 delete backend

# Verify port listening
netstat -tulnp | grep 3001

# Test locally
curl http://localhost:3001/api/v1/health

# Test externally
curl http://72.62.131.250:3001/api/v1/health

# SSH into VPS
ssh root@72.62.131.250