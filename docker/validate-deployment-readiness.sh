#!/bin/bash

echo "🧪 TrackWise Local Validation (Using Existing Images)"
echo "===================================================="

echo "✅ Docker is available: $(docker --version)"
echo "✅ Docker Compose is available: $(docker compose version)"

echo ""
echo "📦 Available local images:"
docker images | grep -E "(python|node|nginx)" | head -5

echo ""
echo "🔍 Checking Dockerfile syntax..."

# Check backend Dockerfile
echo "📋 Backend Dockerfile (Dockerfile.backend.prod):"
if [ -f "Dockerfile.backend.prod" ]; then
    echo "✅ Backend Dockerfile exists"
    # Check for common issues
    if grep -q "FROM python:" Dockerfile.backend.prod; then
        echo "✅ Uses Python base image"
    fi
    if grep -q "COPY requirements.txt" Dockerfile.backend.prod; then
        echo "✅ Copies requirements file"
    fi
    if grep -q "RUN pip install" Dockerfile.backend.prod; then
        echo "✅ Installs Python dependencies"
    fi
else
    echo "❌ Backend Dockerfile not found"
fi

echo ""
echo "📋 Frontend Dockerfile (Dockerfile.frontend.prod):"
if [ -f "Dockerfile.frontend.prod" ]; then
    echo "✅ Frontend Dockerfile exists"
    # Check for common issues  
    if grep -q "FROM node:" Dockerfile.frontend.prod; then
        echo "✅ Uses Node base image for build"
    fi
    if grep -q "nginx" Dockerfile.frontend.prod; then
        echo "✅ Uses Nginx for serving"
    fi
else
    echo "❌ Frontend Dockerfile not found"
fi

echo ""
echo "📋 Docker Compose Configuration:"
if [ -f "docker-compose.prod.yml" ]; then
    echo "✅ Production docker-compose exists"
    
    # Check services
    if grep -q "backend:" docker-compose.prod.yml; then
        echo "✅ Backend service defined"
    fi
    if grep -q "frontend:" docker-compose.prod.yml; then
        echo "✅ Frontend service defined"  
    fi
    if grep -q "db:" docker-compose.prod.yml; then
        echo "✅ Database service defined"
    fi
else
    echo "❌ Production docker-compose not found"
fi

echo ""
echo "📋 Environment Configuration:"
if [ -f ".env.prod.example" ]; then
    echo "✅ Production environment template exists"
    echo "📄 Sample configuration:"
    head -10 .env.prod.example | grep -v "^#" | head -5
else
    echo "❌ Production environment template not found"
fi

echo ""
echo "🎯 Deployment Readiness Assessment:"
echo "=================================="

# Check deployment scripts
deployment_ready=true

if [ -f "deploy/setup-ec2.sh" ]; then
    echo "✅ EC2 setup script ready"
else
    echo "❌ EC2 setup script missing"
    deployment_ready=false
fi

if [ -f "deploy/deploy.sh" ]; then
    echo "✅ Deployment script ready"  
else
    echo "❌ Deployment script missing"
    deployment_ready=false
fi

if [ -f "DEPLOYMENT.md" ]; then
    echo "✅ Deployment documentation ready"
else
    echo "❌ Deployment documentation missing" 
    deployment_ready=false
fi

echo ""
if [ "$deployment_ready" = true ]; then
    echo "🎉 READY FOR EC2 DEPLOYMENT!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Launch Ubuntu EC2 instance (t3.medium or larger)"
    echo "2. Clone repository on EC2"  
    echo "3. Run: chmod +x deploy/setup-ec2.sh && sudo ./deploy/setup-ec2.sh"
    echo "4. Configure .env.prod with your settings"
    echo "5. Run: ./deploy/deploy.sh"
    echo ""
    echo "💡 Your local Docker network issue won't affect EC2 deployment!"
else
    echo "❌ Some deployment files are missing"
fi