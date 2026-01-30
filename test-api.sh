#!/bin/bash
# Simple test to check if API endpoint works and returns proper deactivation error

echo "Testing /api/v1/users/me endpoint..."

# Test without authentication
echo "1. Testing without authentication:"
curl -X GET http://localhost:8080/api/v1/users/me \
  -H "Content-Type: application/json" \
  -v 2>&1 | head -10

echo -e "\n2. Testing with invalid token:"
curl -X GET http://localhost:8080/api/v1/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token" \
  -v 2>&1 | head -10

echo -e "\n3. Checking if user-service is responding:"
curl -X GET http://localhost:8080/healthz -v 2>&1 | head -10