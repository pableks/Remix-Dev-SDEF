# SDEF Deployment Guide

## Prerequisites

1. **Azure VM Setup**
   - Ubuntu/Debian-based VM
   - Docker and Docker Compose installed
   - Ports 80 and 443 open in Azure Security Groups

2. **Domain Configuration**
   - Domain `sdef.site` pointing to your Azure VM's public IP
   - DNS A record: `sdef.site` → `YOUR_VM_PUBLIC_IP`
   - DNS A record: `www.sdef.site` → `YOUR_VM_PUBLIC_IP`

## Installation Steps

### 1. Install Docker (if not already installed)
```bash
# Update package index
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for group changes to take effect
```

### 2. Deploy the Application
```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### 3. Verify Deployment
- Check containers: `docker-compose ps`
- View logs: `docker-compose logs -f`
- Test locally: `curl http://localhost`
- Test domain: `curl https://sdef.site`

## Configuration Files

### Caddyfile
- Handles automatic HTTPS with Let's Encrypt
- Reverse proxy to the Remix app
- Security headers and caching
- Logging configuration

### docker-compose.yml
- Orchestrates the app and Caddy containers
- Network configuration
- Volume management
- Environment variables

### Dockerfile
- Multi-stage build for optimization
- Production-ready Node.js setup
- Security best practices

## Troubleshooting

### Common Issues

1. **Domain not resolving**
   - Check DNS records
   - Verify Azure VM public IP
   - Check Azure Security Groups (ports 80, 443)

2. **SSL certificate issues**
   - Ensure domain is properly configured
   - Check Caddy logs: `docker-compose logs caddy`
   - Verify Let's Encrypt can reach your domain

3. **Application not starting**
   - Check app logs: `docker-compose logs app`
   - Verify environment variables
   - Check backend connectivity

### Useful Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
docker-compose logs -f caddy

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Check container status
docker-compose ps

# Execute commands in running container
docker-compose exec app sh
docker-compose exec caddy sh
```

## Security Considerations

1. **Environment Variables**
   - Change `SESSION_SECRET` to a strong, unique value
   - Use environment-specific values for production

2. **Firewall**
   - Only expose necessary ports (80, 443)
   - Consider additional firewall rules

3. **Updates**
   - Regularly update Docker images
   - Monitor security advisories

## Monitoring

- Application logs: `/var/log/caddy/sdef.site.log`
- Container logs: `docker-compose logs`
- System resources: `docker stats`

## Backup Strategy

1. **Database backups** (if applicable)
2. **Configuration files** (Caddyfile, docker-compose.yml)
3. **SSL certificates** (automatically managed by Caddy)
4. **Application data** (if any persistent volumes)

## Support

For issues or questions, check:
1. Container logs
2. DNS configuration
3. Azure VM network settings
4. Caddy documentation: https://caddyserver.com/docs/ 