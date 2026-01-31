# Deployment Service

A Spring Boot application providing REST API endpoints for managing containers in a deployment system. The service uses JPA for data persistence with PostgreSQL and includes containerization support via Docker.

## API Server

The deployment service provides a REST API server for managing containers. The server runs on port 8080 by default and exposes endpoints for container operations.

## API Endpoints

The API provides the following endpoints under `/api/v1/containers`:

### GET /api/v1/containers
Retrieve all containers.

**Response:**
```json
[
  {
    "containerID": "string (UUID)",
    "projectID": "string",
    "name": "string",
    "status": "string",
    "image": "string",
    "port": "integer",
    "createdAt": "string (ISO 8601 LocalDateTime)",
    "repoUrl": "string",
    "branch": "string"
  }
]
```

### GET /api/v1/containers/{projectID}
Retrieve containers by project ID.

**Path Parameters:**
- `projectID` (string): The project identifier

**Response:**
```json
[
  {
    "containerID": "string (UUID)",
    "projectID": "string",
    "name": "string",
    "status": "string",
    "image": "string",
    "port": "integer",
    "createdAt": "string (ISO 8601 LocalDateTime)",
    "repoUrl": "string",
    "branch": "string"
  }
]
```

### POST /api/v1/containers
Create a new container.

**Request:**
```json
{
  "projectID": "string",
  "name": "string",
  "image": "string",
  "port": "integer",
  "repoUrl": "string",
  "branch": "string"
}
```

**Response:**
```json
{
  "containerID": "string (UUID)",
  "projectID": "string",
  "name": "string",
  "status": "string",
  "image": "string",
  "port": "integer",
  "createdAt": "string (ISO 8601 LocalDateTime)",
  "repoUrl": "string",
  "branch": "string"
}
```

### DELETE /api/v1/containers/{containerID}
Delete a container by its ID.

**Path Parameters:**
- `containerID` (string): The unique identifier of the container to delete

**Response:**
- `204 No Content` on successful deletion
- `404 Not Found` if container does not exist
- `500 Internal Server Error` if external service deletion fails

**Process:**
This endpoint implements a two-phase deletion process:
1. **External Service Deletion**: First calls the deployment service at `http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/webapp/{projectID}/{containerID}` to delete the actual container
2. **Database Cleanup**: Only after successful external deletion, removes the container record from the database

**Error Handling:**
- If the container is not found in the database, throws `RuntimeException` with "Container not found" message
- If external service deletion fails, throws `RuntimeException` and does not delete from database (rollback behavior)
- If database deletion fails after successful external deletion, the container record remains in database but external container is deleted

Request/Response models are defined in the `data.container` package.

## Configuration

Configuration is managed via `application.yaml` and can be overridden with environment variables:

- `SERVER_PORT`: Server port (default: 8080)
- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name (default: deployment_service)
- `DB_USERNAME`: Database username (default: deployment_service)
- `DB_PASSWORD`: Database password (default: change-me)
- `HIBERNATE_DDL_AUTO`: Hibernate DDL auto mode (default: update)
- `SQL_INIT_MODE`: SQL initialization mode (default: always)

## Dependencies

Key dependencies include:
- Spring Boot Starter Web
- Spring Boot Starter Data JPA
- PostgreSQL Driver
- Lombok
- MapStruct

## Testing

Run tests using Gradle:
```bash
./gradlew test
```

## Project Structure

- `src/main/java/com/kleff/deployment/` - Main application code
  - `business/` - Business logic layer
  - `data/` - Data models and repositories
  - `presentation/` - REST controllers
  - `utils/` - Utility classes
- `src/main/resources/` - Application configuration
- `src/test/` - Unit tests

## Architecture

The application follows a layered architecture pattern:

- **Presentation Layer** (`presentation/`): REST controllers handling HTTP requests
- **Business Layer** (`business/`): Service classes containing business logic and external integrations
- **Data Layer** (`data/`): JPA entities, repositories, and data transfer objects

### Key Design Decisions

- **MapStruct**: Used for type-safe DTO-to-entity mapping to maintain separation between API contracts and persistence models
- **Lombok**: Reduces boilerplate code for getters, setters, constructors, and builders
- **JPA**: Provides ORM capabilities with custom finder methods in repositories

## Business Logic

### Container Deployment Flow

When a container is created via POST `/api/v1/containers`:

1. Container entity is saved to database with status "Running" and current timestamp
2. External build service is triggered at `https://api.kleff.io/api/v1/deployment/build`
3. Build request includes repository URL, branch, image name, and application port

### Container Deletion Flow

When a container is deleted via the service layer:

1. **Container Lookup**: Service retrieves container from database using `containerID`
2. **External Service Deletion**: Calls deployment service at `http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/webapp/{projectID}/{containerID}`
3. **Database Cleanup**: Only after successful external deletion, removes container record from database
4. **Error Handling**: If external deletion fails, throws exception and does not delete from database (ensures consistency)

### Service Layer Methods

The `ContainerServiceImpl` provides the following key methods:

- `getAllContainers()`: Retrieves all containers from database
- `getContainersByProjectID(String projectID)`: Retrieves containers filtered by project
- `createContainer(ContainerRequestModel request)`: Creates new container and triggers build
- `updateContainer(String containerID, ContainerRequestModel request)`: Updates container and triggers rebuild
- `updateContainerEnvVariables(String containerID, Map<String, String> envVariables)`: Updates environment variables
- `deleteContainer(String containerID)`: Deletes container (two-phase process)
- `triggerWebAppDelete(String projectID, String containerID)`: Internal method for external service deletion

### External Dependencies

- **Build Service**: REST API at `https://api.kleff.io/api/v1/deployment/build` that handles the actual container deployment
- **PostgreSQL**: Primary data store for container metadata

## Database Schema

**Container Entity:**
- `containerID` (UUID, Primary Key)
- `projectID` (String)
- `name` (String)
- `status` (String)
- `image` (String)
- `port` (Integer)
- `createdAt` (LocalDateTime)
- `repoUrl` (String)
- `branch` (String)

## Development Setup

### Prerequisites
- Java 17
- PostgreSQL
- Docker (optional)

### Local Development

1. **Database Setup:**
   ```bash
   createdb deployment_service
   ```

2. **Environment Variables:**
   ```bash
   export DB_HOST=localhost
   export DB_PORT=5432
   export DB_NAME=deployment_service
   export DB_USERNAME=deployment_service
   export DB_PASSWORD=change-me
   ```

3. **Run Application:**
   ```bash
   ./gradlew bootRun
   ```

### Docker Development

```bash
docker build -t deployment-service .
docker run -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PASSWORD=your-password \
  deployment-service
```

## Testing

### Test Structure
- Unit tests for service methods
- Integration tests for repository and controller layers
- Mock external service calls for isolated testing

### Running Tests
```bash
./gradlew test
```

## Security

### CORS Configuration
Allows requests from:
- `http://localhost:5173` (development frontend)
- `https://api.kleff.io` (production API)
- `http://localhost:3000` (alternative dev port)
- `https://kleff.io` (production frontend)

### Authentication
Currently not implemented - consider adding OAuth2/JWT for production use.

## Deployment

### Docker Build
```bash
docker build -t deployment-service .
```

### Production Configuration
Override default environment variables for production database and external services.

## API Error Handling

Current implementation returns `null` for not-found scenarios. Consider implementing proper HTTP error responses:

- `404 Not Found` for missing resources
- `400 Bad Request` for invalid input
- `500 Internal Server Error` for system errors

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new features
3. Update documentation as needed
4. Ensure builds pass before submitting pull requests
