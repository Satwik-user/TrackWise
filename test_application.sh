#!/bin/bash

echo "🚂 TrackWise Application Health Check"
echo "=" * 50

# Test backend health
echo "🔍 Testing Backend Health..."
backend_health=$(curl -s http://localhost:8000/health)
if [[ $? -eq 0 ]]; then
    echo "✅ Backend Health: OK"
    echo "   Response: $backend_health"
else
    echo "❌ Backend Health: FAILED"
    exit 1
fi

# Test authentication
echo ""
echo "🔐 Testing Authentication..."
auth_response=$(curl -s -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' http://localhost:8000/api/auth/login/json)
if [[ $? -eq 0 && $auth_response == *"access_token"* ]]; then
    echo "✅ Authentication: OK"
    token=$(echo $auth_response | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    echo "   Token received: ${token:0:20}..."
else
    echo "❌ Authentication: FAILED"
    exit 1
fi

# Test protected endpoints
echo ""
echo "📊 Testing Protected Endpoints..."

# Test analytics
analytics_response=$(curl -s -H "Authorization: Bearer $token" http://localhost:8000/api/analytics/dashboard)
if [[ $? -eq 0 && $analytics_response == *"train_analytics"* ]]; then
    echo "✅ Analytics Endpoint: OK"
else
    echo "❌ Analytics Endpoint: FAILED"
fi

# Test trains
trains_response=$(curl -s -H "Authorization: Bearer $token" http://localhost:8000/api/trains/)
if [[ $? -eq 0 && $trains_response == *"train_number"* ]]; then
    echo "✅ Trains Endpoint: OK"
    train_count=$(echo $trains_response | grep -o '"id":' | wc -l)
    echo "   Found $train_count trains"
else
    echo "❌ Trains Endpoint: FAILED"
fi

# Test sections
sections_response=$(curl -s -H "Authorization: Bearer $token" http://localhost:8000/api/sections/)
if [[ $? -eq 0 && $sections_response == *"section_code"* ]]; then
    echo "✅ Sections Endpoint: OK"
    section_count=$(echo $sections_response | grep -o '"id":' | wc -l)
    echo "   Found $section_count sections"
else
    echo "❌ Sections Endpoint: FAILED"
fi

# Test optimization
optimization_response=$(curl -s -H "Authorization: Bearer $token" http://localhost:8000/api/optimization/)
if [[ $? -eq 0 && $optimization_response == *"optimization_type"* ]]; then
    echo "✅ Optimization Endpoint: OK"
    opt_count=$(echo $optimization_response | grep -o '"id":' | wc -l)
    echo "   Found $opt_count optimization runs"
else
    echo "❌ Optimization Endpoint: FAILED"
fi

# Test frontend
echo ""
echo "🌐 Testing Frontend..."
frontend_response=$(curl -s http://localhost:3000 | head -10)
if [[ $? -eq 0 && $frontend_response == *"TrackWise"* ]]; then
    echo "✅ Frontend: OK"
    echo "   React app is responding"
else
    echo "❌ Frontend: FAILED"
fi

echo ""
echo "🎉 TrackWise Application Health Check Complete!"
echo "=" * 50