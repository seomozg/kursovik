#!/bin/bash

# Production Deployment Script for Kursovik
# This script sets up the application for production deployment

set -e

echo "🚀 Starting Kursovik Production Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."

    # Check Docker availability by trying to run it
    if ! docker --version >/dev/null 2>&1; then
        print_error "Docker is not installed or not accessible. Please install Docker first."
        print_error "Note: Make sure Docker daemon is running."
        exit 1
    fi

    # Check Docker Compose availability (try both syntaxes)
    DOCKER_COMPOSE_AVAILABLE=false
    if docker compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE_AVAILABLE=true
        DOCKER_COMPOSE_CMD="docker compose"
    elif docker-compose --version >/dev/null 2>&1; then
        DOCKER_COMPOSE_AVAILABLE=true
        DOCKER_COMPOSE_CMD="docker-compose"
    fi

    if ! $DOCKER_COMPOSE_AVAILABLE; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Test Docker connectivity
    if ! docker ps >/dev/null 2>&1; then
        print_error "Cannot connect to Docker daemon. Please ensure Docker daemon is running."
        print_error "Try: sudo systemctl start docker (Linux) or start Docker Desktop (Windows/Mac)"
        exit 1
    fi

    print_status "Dependencies check passed ✓"
}

# Create production environment file
setup_environment() {
    print_status "Setting up production environment..."

    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.example .env
    fi

    # Ensure production settings
    if ! grep -q "DATABASE_URL=postgresql://postgres:" .env; then
        print_warning "Updating database URL for production..."
        sed -i 's|DATABASE_URL=sqlite://.*|DATABASE_URL=postgresql://postgres:changeme123@db:5432/kursovik|' .env
    fi

    # Check for required environment variables
    if ! grep -q "DEEPSEEK_API_KEY=" .env || grep -q "DEEPSEEK_API_KEY=test_key_placeholder" .env; then
        print_error "DEEPSEEK_API_KEY is not set in .env file. Please set it before deployment."
        exit 1
    fi

    print_status "Environment setup completed ✓"
}

# Build and start production containers
deploy_containers() {
    print_status "Building and starting production containers..."
    print_status "Using: $DOCKER_COMPOSE_CMD"

    # Stop any existing containers
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down || true

    # Build and start containers
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d --build

    print_status "Waiting for services to start..."
    sleep 30

    # Check if services are running
    if ! $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml ps | grep -q "Up"; then
        print_error "Some services failed to start. Check logs:"
        $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs
        exit 1
    fi

    print_status "Production containers deployed ✓"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."

    # Run Alembic migrations with explicit DATABASE_URL
    DATABASE_URL="${DATABASE_URL:-postgresql://postgres:changeme123@db:5432/kursovik}" \
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml exec -T -e DATABASE_URL="$DATABASE_URL" backend alembic upgrade head

    print_status "Database migrations completed ✓"
}

# Health checks
health_check() {
    print_status "Running health checks..."

    # Check backend health
    max_attempts=30
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost/api/topics/ &>/dev/null; then
            print_status "Backend health check passed ✓"
            break
        fi

        print_warning "Backend not ready, attempt $attempt/$max_attempts..."
        sleep 10
        ((attempt++))
    done

    if [ $attempt -gt $max_attempts ]; then
        print_error "Backend health check failed"
        exit 1
    fi

    print_status "All health checks passed ✓"
}

# Setup SSL (optional)
setup_ssl() {
    print_status "Setting up SSL certificates..."

    if [ ! -d "ssl" ]; then
        mkdir -p ssl
        print_warning "SSL directory created. Please add your certificates:"
        echo "  - ssl/fullchain.pem (certificate)"
        echo "  - ssl/privkey.pem (private key)"
        echo "  Or run: certbot certonly --webroot -w /var/www/html -d yourdomain.com"
    else
        print_status "SSL directory already exists ✓"
    fi
}

# Create backup script
create_backup_script() {
    print_status "Creating backup script..."

    cat > backup.sh << EOF
#!/bin/bash
# Database backup script for Kursovik

BACKUP_DIR="./backups"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\$BACKUP_DIR/kursovik_backup_\$DATE.sql"

mkdir -p \$BACKUP_DIR

echo "Creating database backup: \$BACKUP_FILE"
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml exec -T db pg_dump -U postgres kursovik > \$BACKUP_FILE

if [ \$? -eq 0 ]; then
    echo "Backup completed successfully: \$BACKUP_FILE"
    # Keep only last 7 backups
    ls -t \$BACKUP_DIR/kursovik_backup_*.sql | tail -n +8 | xargs rm -f 2>/dev/null || true
else
    echo "Backup failed!"
    exit 1
fi
EOF

    chmod +x backup.sh
    print_status "Backup script created ✓"
}

# Main deployment process
main() {
    echo "Starting Kursovik production deployment..."

    check_dependencies
    setup_environment
    deploy_containers
    run_migrations
    health_check
    setup_ssl
    create_backup_script

    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo "Application is now running at:"
    echo "  🌐 Frontend: http://your-server:8083"
    echo "  🔧 Backend API: http://your-server:8002"
    echo "  📊 API Docs: http://your-server:8002/docs"
    echo "  ❤️ Health Check: http://your-server:8002/health"
    echo ""
    echo "Next steps:"
    echo "1. Configure external nginx using nginx-site.conf"
    echo "2. Set up domain DNS to point to your server"
    echo "3. Configure SSL certificates for HTTPS"
    echo "4. Test the application thoroughly"
    echo ""
    echo "Useful commands:"
    echo "  $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs -f"
    echo "  $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml restart"
    echo "  ./backup.sh"
    echo ""
    echo "Nginx configuration:"
    echo "  sudo cp nginx-site.conf /etc/nginx/sites-available/kursovik"
    echo "  sudo ln -s /etc/nginx/sites-available/kursovik /etc/nginx/sites-enabled/"
    echo "  sudo nginx -t && sudo systemctl reload nginx"
}

# Run main function
main "$@"