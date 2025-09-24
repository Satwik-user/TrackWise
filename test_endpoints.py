#!/usr/bin/env python3
"""
Test script to verify all key API endpoints are working
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def get_auth_token():
    """Get authentication token"""
    auth_data = {
        "username": "admin",
        "password": "admin123"
    }
    response = requests.post(f"{BASE_URL}/api/auth/login/json", json=auth_data)
    if response.status_code == 200:
        return response.json().get("access_token")
    else:
        print(f"Authentication failed: {response.status_code}")
        return None

def test_endpoint(url, token, description):
    """Test a single endpoint"""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        response = requests.get(url, headers=headers, timeout=5)
        status = "✓" if response.status_code == 200 else "✗"
        print(f"{status} {description}: {response.status_code}")
        if response.status_code != 200:
            print(f"   Error: {response.text[:100]}")
        return response.status_code == 200
    except Exception as e:
        print(f"✗ {description}: Error - {str(e)}")
        return False

def main():
    print("Testing TrackWise API Endpoints")
    print("=" * 40)
    
    # Get auth token
    token = get_auth_token()
    if not token:
        print("Failed to get authentication token")
        sys.exit(1)
    
    # Test endpoints
    endpoints = [
        (f"{BASE_URL}/health", None, "Health Check"),
        (f"{BASE_URL}/api/trains/", token, "Trains API"),
        (f"{BASE_URL}/api/sections/", token, "Sections API"),
        (f"{BASE_URL}/api/decisions/status", token, "Decisions Status"),
        (f"{BASE_URL}/api/decisions/kpis", token, "Decisions KPIs"),
        (f"{BASE_URL}/api/predictions/models/status", token, "ML Predictions"),
        (f"{BASE_URL}/api/simulation/status", token, "Simulation Status"),
        (f"{BASE_URL}/api/analytics/dashboard", token, "Analytics Dashboard"),
    ]
    
    success_count = 0
    total_count = len(endpoints)
    
    for url, auth_token, description in endpoints:
        if test_endpoint(url, auth_token, description):
            success_count += 1
    
    print("\n" + "=" * 40)
    print(f"Results: {success_count}/{total_count} endpoints working")
    
    if success_count == total_count:
        print("✓ All key endpoints are working correctly!")
        sys.exit(0)
    else:
        print("✗ Some endpoints need attention")
        sys.exit(1)

if __name__ == "__main__":
    main()