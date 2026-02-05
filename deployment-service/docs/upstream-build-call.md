# Upstream Call: Build Container Creation

The `deployment-service` makes an upstream call to the `deployment-backend-service` to trigger a build and deployment when a new container is created or an existing one is updated.

## Endpoint Details

- **Target Service**: `deployment-backend-service`
- **URL**: `http://deployment-backend-service.kleff-deployment.svc.cluster.local/api/v1/build/create`
- **Method**: `POST`
- **Content-Type**: `application/json`

## Request Body (GoBuildRequest)

The request body is a JSON object with the following fields:

| Field | Type | Description |
| :--- | :--- | :--- |
| `containerID` | String | Unique identifier for the container. |
| `projectID` | String | Identifier of the project the container belongs to. |
| `repoUrl` | String | URL of the git repository to build from. |
| `branch` | String | Git branch to use (defaults to `main` if null or empty). |
| `port` | Integer | The port number the application listens on. |
| `name` | String | Name of the container. |
| `envVariables` | Map<String, String> | Environment variables for the container. |
| `enableDatabase` | Boolean | Whether a database should be enabled for this container. |
| `storageSizeGB` | Integer | Storage size in GB (required if `enableDatabase` is true). |

### Example Request

```json
{
  "containerID": "cont-123",
  "projectID": "proj-456",
  "repoUrl": "https://github.com/user/repo",
  "branch": "main",
  "port": 8080,
  "name": "my-app",
  "envVariables": {
    "NODE_ENV": "production",
    "API_KEY": "secret"
  },
  "enableDatabase": true,
  "storageSizeGB": 10
}
```

## Implementation Reference

The call is triggered in `ContainerServiceImpl.java` via the `triggerBuildDeployment` method:

```java
private void triggerBuildDeployment(ContainerRequestModel request, String containerID) {
    String deploymentServiceUrl = BASE_URL + "/api/v1/build/create";

    GoBuildRequest buildRequest = new GoBuildRequest(
            containerID,
            request.getProjectID(),
            request.getRepoUrl(),
            request.getBranch(),
            request.getPort(),
            request.getName(),
            request.getEnvVariables(),
            request.isEnableDatabase(),
            request.getStorageSizeGB());

    try {
        restTemplate.postForObject(deploymentServiceUrl, buildRequest, String.class);
        log.info("Update/Build triggered successfully for: {}", request.getName());
    } catch (Exception e) {
        log.error("Failed to trigger build service for {}: {}", request.getName(), e.getMessage());
    }
}
```
