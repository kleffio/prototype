# Kleff Project Management System

A comprehensive, microservices-based project management platform designed for modern development teams.

## 🚀 Live Production
**URL:** [https://kleff.io](https://kleff.io)

## 🏗️ Architecture

The system is built using a microservices architecture:

| Service | Technology | Description | Port |
|---------|------------|-------------|------|
| **Frontend** | React, Vite, TypeScript | User interface | 3000 |
| **Project Management Service** | Java (Spring Boot) | Core project data, invitations, audit logs | 8081 |
| **User Service** | Go (Chi) | User identity, authentication, profiles | 8082 |
| **Billing Service** | Java (Spring Boot) | Subscriptions, plans, payments | 8085 |
| **Deployment Service** | Java (Spring Boot) | Container deployment and management | 8084 |
| **Observability Service** | Go (Gin) | Metrics, logs, system usage monitoring | 8083 |
| **Nginx Proxy** | Nginx | API Gateway routing requests to services | 8080 |

## 🛠️ Prerequisites

- Docker
- Docker Compose

## 🏃‍♂️ Running Locally

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd www
   ```

2. **Start all services**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - API Gateway: [http://localhost:8080](http://localhost:8080)

## 🔒 Authentication

The system uses JWT-based authentication via **Authentik**.
- Auth URL: `https://auth.kleff.io`
- Issuer: `https://auth.kleff.io/application/o/kleff/`

## 📝 API Endpoints

All APIs are routed through the Nginx gateway at `http://localhost:8080/api/v1/...`

- **/api/v1/projects** - Project management
- **/api/v1/users** - User profiles and status
- **/api/v1/billing** - Subscription management
- **/api/v1/containers** - Deployment management
- **/api/v1/systems** - Observability metrics

## 🧪 Testing

To run tests for specific services:

**Java Services:**
```bash
cd project-management-service
./gradlew test
```

**Go Services:**
```bash
cd user-service
go test ./...
```

**Frontend:**
```bash
cd frontend
npm test
```
