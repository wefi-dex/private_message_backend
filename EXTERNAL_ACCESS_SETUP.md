# External Access Setup Guide

## Problem
When trying to access the backend API from another IP address, you get "not found" errors because the server is only listening on localhost.

## Solution

### 1. Server Binding (Already Fixed)
The server now listens on `0.0.0.0` instead of `localhost`, making it accessible from all network interfaces.

### 2. CORS Configuration
Update your `.env` file to include external IP addresses:

```env
# Add your external IP addresses to CORS_ORIGIN
CORS_ORIGIN=http://localhost:3000,http://localhost:19006,http://YOUR_EXTERNAL_IP:3000,http://YOUR_EXTERNAL_IP:19006
```

### 3. Firewall Configuration
Make sure your firewall allows connections on port 8000 (or your configured port):

**Windows:**
```powershell
# Allow inbound connections on port 8000
netsh advfirewall firewall add rule name="Backend API" dir=in action=allow protocol=TCP localport=8000
```

**Linux/Mac:**
```bash
# Allow inbound connections on port 8000
sudo ufw allow 8000
```

### 4. Network Configuration
- Ensure your router forwards port 8000 to your development machine
- Use your machine's local IP address (e.g., 192.168.1.100:8000) for local network access
- Use your public IP address for internet access (requires port forwarding)

### 5. Testing External Access
1. Find your machine's IP address:
   - Windows: `ipconfig`
   - Linux/Mac: `ifconfig` or `ip addr`

2. Test from another device:
   ```bash
   curl http://YOUR_MACHINE_IP:8000/ping
   ```

3. Update your frontend API configuration to use the external IP:
   ```javascript
   const API_BASE_URL = 'http://YOUR_MACHINE_IP:8000/api';
   ```

### 6. Security Considerations
- Only allow external access in development
- Use HTTPS in production
- Implement proper authentication
- Consider using a reverse proxy (nginx) for production

### 7. Troubleshooting
- Check if the port is open: `telnet YOUR_IP 8000`
- Verify firewall settings
- Check router port forwarding
- Use `netstat -an | grep 8000` to verify the server is listening on all interfaces 