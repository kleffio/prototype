package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

// Server holds dependencies to avoid global state
type Server struct {
	KubeClient    kubernetes.Interface
	DynamicClient dynamic.Interface
	Logger        *slog.Logger
	RegistryBase  string // Will default to "kleff.azurecr.io"
}

type BuildRequest struct {
	ContainerID  string            `json:"containerID"`
	ProjectID    string            `json:"projectID"`
	Name         string            `json:"name"`    // App name
	RepoURL      string            `json:"repoUrl"` // Source Git URL
	Branch       string            `json:"branch"`  // Git Branch
	Port         int               `json:"port"`    // Optional: App Port
	EnvVariables map[string]string `json:"envVariables,omitempty"` // Environment variables
}

type UpdateWebAppRequest struct {
	ProjectID    string            `json:"projectID"`
	ContainerID  string 		   `json:"containerID"`
	Name         string            `json:"name"`          // App name
	EnvVariables map[string]string `json:"envVariables"`  // Environment variables
}

type Response struct {
	Namespace string `json:"namespace"`
	JobName   string `json:"job_name,omitempty"`
	AppName   string `json:"app_name,omitempty"`
	Image     string `json:"image,omitempty"`
	Message   string `json:"message"`
	Existed   bool   `json:"existed"`
}

// Regex for DNS-1123 validation
var validNameRegex = regexp.MustCompile(`^[a-z0-9]([-a-z0-9]*[a-z0-9])?$`)

// Define the GVR (Group Version Resource) for your CRD
var webAppGVR = schema.GroupVersionResource{
	Group:    "kleff.kleff.io",
	Version:  "v1",
	Resource: "webapps", // Plural name of the resource
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	var kubeconfig *string
	if home := homedir.HomeDir(); home != "" {
		kubeconfig = flag.String("kubeconfig", filepath.Join(home, ".kube", "config"), "(optional) absolute path to the kubeconfig file")
	} else {
		kubeconfig = flag.String("kubeconfig", "", "absolute path to the kubeconfig file")
	}

	// 1. Set the default registry to kleff.azurecr.io
	// It checks ENV first, then falls back to your hardcoded value.
	defaultRegistry := os.Getenv("CONTAINER_REGISTRY")
	if defaultRegistry == "" {
		defaultRegistry = "kleff.azurecr.io"
	}

	registry := flag.String("registry", defaultRegistry, "The container registry base URL")
	flag.Parse()

	// Validate Registry
	if *registry == "" {
		logger.Error("Registry configuration missing.")
		os.Exit(1)
	}

	config, err := rest.InClusterConfig()
	if err != nil {
		config, err = clientcmd.BuildConfigFromFlags("", *kubeconfig)
		if err != nil {
			logger.Error("Error building kubeconfig", "error", err)
			os.Exit(1)
		}
	}

	// 2. Standard Client
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		logger.Error("Error creating clientset", "error", err)
		os.Exit(1)
	}

	// 3. Dynamic Client (For CRDs)
	dynClient, err := dynamic.NewForConfig(config)
	if err != nil {
		logger.Error("Error creating dynamic client", "error", err)
		os.Exit(1)
	}

	// Clean up registry string (remove trailing slash)
	cleanRegistry := strings.TrimRight(*registry, "/")

	server := &Server{
		KubeClient:    clientset,
		DynamicClient: dynClient,
		Logger:        logger,
		RegistryBase:  cleanRegistry,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/build/create", enableCors(server.handleCreateBuild))
	mux.HandleFunc("/api/v1/build/hello", enableCors(server.handleHelloWorld))
	mux.HandleFunc("/api/v1/webapp/update", enableCors(server.handleUpdateWebApp))

		srv := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	logger.Info("Build Manager started on port 8080...", "registry", cleanRegistry)
	if err := srv.ListenAndServe(); err != nil {
		logger.Error("Server failed", "error", err)
	}
}

func (s *Server) handleHelloWorld(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("Hello World, this is a CD test for christine"))
}

func (s *Server) handleCreateBuild(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	// Limit request body size (1MB)
	r.Body = http.MaxBytesReader(w, r.Body, 1048576)

	var req BuildRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	// 1. Validation
	if req.ProjectID == "" || req.ContainerID == "" || req.RepoURL == "" {
		http.Error(w, "projectID, containerID, and repoUrl are required", http.StatusBadRequest)
		return
	}

	// 2. Sanitize IDs
	// Namespace Name = Project ID
	namespaceName, err := validateAndSanitize(req.ProjectID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Invalid Project ID format: %v", err), http.StatusBadRequest)
		return
	}

	// SANITIZATION LOGIC:
	// rawUUID is the clean version of the UUID (e.g. "68af67d3...")
	// resourceName is the name for K8s objects (e.g. "app-68af67d3...")
	rawUUID, err := validateAndSanitize(req.ContainerID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Invalid Container ID format: %v", err), http.StatusBadRequest)
		return
	}
	resourceName := "app-" + rawUUID

	// App Name for Docker Registry (keep human name for registry readability)
	imageRepoName, _ := validateAndSanitize(req.Name)
	if imageRepoName == "" {
		imageRepoName = resourceName
	}

	// 3. Generate Image Tag
	tag := fmt.Sprintf("%d", time.Now().Unix())
	generatedImage := fmt.Sprintf("%s/%s:%s", s.RegistryBase, imageRepoName, tag)

	// 4. Create Target Namespace (if not exists)
	existed, err := s.createNamespace(r.Context(), namespaceName)
	if err != nil {
		s.Logger.Error("Failed to create namespace", "namespace", namespaceName, "error", err)
		http.Error(w, "Failed to initialize environment", http.StatusInternalServerError)
		return
	}

	// 5. Submit Kaniko Build Job
	// Use the resourceName in the job name to keep it linked
	jobName := fmt.Sprintf("build-%s-%s", resourceName, tag)
	if err := s.createKanikoJob(r.Context(), "default", jobName, req.RepoURL, req.Branch, generatedImage); err != nil {
		s.Logger.Error("Failed to create build job", "job", jobName, "error", err)
		http.Error(w, "Failed to start build process", http.StatusInternalServerError)
		return
	}

	// 6. Create or Update the WebApp Custom Resource
	// We pass resourceName ("app-UUID") as the K8s name, 
	// but the original req (containing raw UUID) is stored in the Spec.
	if err := s.createWebApp(r.Context(), namespaceName, resourceName, generatedImage, req); err != nil {
		s.Logger.Error("Failed to create WebApp CR", "id", resourceName, "error", err)
		http.Error(w, "Build started, but failed to sync deployment metadata", http.StatusInternalServerError)
		return
	}

	s.Logger.Info("Build and Deployment triggered", 
		"resourceName", resourceName, 
		"rawUUID", rawUUID, 
		"image", generatedImage,
	)
	
	// 7. Success Response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{
		Namespace: namespaceName,
		JobName:   jobName,
		AppName:   req.Name,
		Image:     generatedImage,
		// Update message to reflect the new URL format
		Message:   fmt.Sprintf("Deployment created. URL: https://%s.kleff.io", resourceName),
		Existed:   existed,
	})
}
// createWebApp uses the Dynamic Client to create or update the Custom Resource
	func (s *Server) createWebApp(ctx context.Context, namespace, resourceName, image string, req BuildRequest) error {
		port := req.Port
		if port == 0 {
			port = 8080
		}

		// Construct the Unstructured object
		webApp := &unstructured.Unstructured{
			Object: map[string]interface{}{
				"apiVersion": "kleff.kleff.io/v1",
				"kind":       "WebApp",
				"metadata": map[string]interface{}{
					"name":      resourceName, // UUID
					"namespace": namespace,
					"labels": map[string]interface{}{
						"container-id": req.ContainerID,
					},
				},
				"spec": map[string]interface{}{
					"containerID":  req.ContainerID,
					"displayName":  req.Name, // User-friendly name
					"image":        image,
					"port":         int64(port),
					"repoURL":      req.RepoURL,
					"branch":       req.Branch,
					"envVariables": req.EnvVariables,
				},
			},
		}

		_, err := s.DynamicClient.Resource(webAppGVR).Namespace(namespace).Create(ctx, webApp, metav1.CreateOptions{})
		if err != nil {
			if k8serrors.IsAlreadyExists(err) {
				s.Logger.Info("Updating existing WebApp", "id", resourceName)

				existing, getErr := s.DynamicClient.Resource(webAppGVR).Namespace(namespace).Get(ctx, resourceName, metav1.GetOptions{})
				if getErr != nil {
					return getErr
				}

				spec, ok := existing.Object["spec"].(map[string]interface{})
				if !ok {
					spec = make(map[string]interface{})
				}
				
				// Update ALL fields to ensure they reflect the latest UI changes
				spec["displayName"] = req.Name
				spec["image"]       = image
				spec["port"]        = int64(port)
				spec["branch"]      = req.Branch
				spec["repoURL"]     = req.RepoURL
				if req.EnvVariables != nil {
					spec["envVariables"] = req.EnvVariables
				}
				
				existing.Object["spec"] = spec

				_, updateErr := s.DynamicClient.Resource(webAppGVR).Namespace(namespace).Update(ctx, existing, metav1.UpdateOptions{})
				return updateErr
			}
			return err
		}
		return nil
	}
func (s *Server) handleUpdateWebApp(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch && r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var req UpdateWebAppRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	// Validation
	if req.ProjectID == "" || req.ContainerID == "" {
		http.Error(w, "projectID and containerID are required", http.StatusBadRequest)
		return
	}

	namespaceName, _ := validateAndSanitize(req.ProjectID)
	
	// Ensure we lookup the resource using the "app-" prefix
	rawUUID, _      := validateAndSanitize(req.ContainerID)
	resourceName    := "app-" + rawUUID

	// Update the WebApp CRD using the resourceName (app-<UUID>)
	if err := s.updateWebAppEnvVariables(r.Context(), namespaceName, resourceName, req.EnvVariables); err != nil {
		s.Logger.Error("Failed to update WebApp env vars", "resourceName", resourceName, "error", err)
		http.Error(w, fmt.Sprintf("Failed to update WebApp: %v", err), http.StatusInternalServerError)
		return
	}

	s.Logger.Info("WebApp environment variables updated", "resourceName", resourceName, "uuid", rawUUID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{
		Namespace: namespaceName,
		AppName:   req.Name,
		Message:   "Environment variables updated successfully",
	})
}
func (s *Server) createNamespace(ctx context.Context, name string) (bool, error) {
	nsSpec := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
			Labels: map[string]string{
				"managed-by": "paas-backend",
				"project-id": name,
			},
		},
	}

	_, err := s.KubeClient.CoreV1().Namespaces().Create(ctx, nsSpec, metav1.CreateOptions{})

	if err != nil {
		if k8serrors.IsAlreadyExists(err) {
			return true, nil
		}
		return false, err
	}
	return false, nil
}

func (s *Server) createKanikoJob(ctx context.Context, namespace, jobName, gitRepo, branch, destinationImage string) error {
	// Fix Git Context for Kaniko (Needs git:// for private/public without auth, or https:// with tokens)
	gitContext := gitRepo
	if strings.HasPrefix(gitContext, "https://") {
		// Convert https to git protocol to avoid interactive auth prompts for public repos
		gitContext = "git://" + strings.TrimPrefix(gitContext, "https://")
	} else if !strings.HasPrefix(gitContext, "git://") {
		gitContext = "git://" + gitContext
	}
	if branch != "" {
		gitContext = fmt.Sprintf("%s#refs/heads/%s", gitContext, branch)
	}
	ttl := int32(3600)
	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      jobName,
			Namespace: namespace,
		},
		Spec: batchv1.JobSpec{
			TTLSecondsAfterFinished: &ttl, 
			BackoffLimit: func(i int32) *int32 { return &i }(2),
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					RestartPolicy: corev1.RestartPolicyNever,
					Containers: []corev1.Container{
						{
							Name:  "kaniko",
							Image: "gcr.io/kaniko-project/executor:latest",
							Args: []string{
								"--dockerfile=Dockerfile",
								"--context=" + gitContext,
								"--destination=" + destinationImage,
								"--cache=true",
							},
							VolumeMounts: []corev1.VolumeMount{
								{
									Name:      "acr-creds-vol",
									MountPath: "/kaniko/.docker",
								},
							},
						},
					},
					Volumes: []corev1.Volume{
						{
							Name: "acr-creds-vol",
							VolumeSource: corev1.VolumeSource{
								Secret: &corev1.SecretVolumeSource{
									SecretName: "acr-creds",
									Items: []corev1.KeyToPath{
										{
											Key:  ".dockerconfigjson",
											Path: "config.json",
										},
									},
								},
							},
						},
					},
				},
			},
		},
	}

	_, err := s.KubeClient.BatchV1().Jobs(namespace).Create(ctx, job, metav1.CreateOptions{})
	return err
}

func validateAndSanitize(name string) (string, error) {
	name = strings.ToLower(name)
	name = strings.ReplaceAll(name, "_", "-")
	name = strings.ReplaceAll(name, " ", "-")
	name = strings.Trim(name, "-")

	if len(name) > 63 {
		return "", fmt.Errorf("name too long (max 63 chars)")
	}
	if len(name) == 0 {
		return "", fmt.Errorf("name cannot be empty")
	}

	if !validNameRegex.MatchString(name) {
		return "", fmt.Errorf("name must consist of alphanumeric characters or '-', and start/end with alphanumeric")
	}

	return name, nil
}

func enableCors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}

		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}



func (s *Server) updateWebAppEnvVariables(ctx context.Context, namespace, name string, envVariables map[string]string) error {
	// Get existing WebApp
	existing, err := s.DynamicClient.Resource(webAppGVR).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return fmt.Errorf("WebApp not found: %s/%s", namespace, name)
		}
		return err
	}

	// Update envVariables in spec
	spec, ok := existing.Object["spec"].(map[string]interface{})
	if !ok {
		spec = make(map[string]interface{})
	}
	
	spec["envVariables"] = envVariables
	existing.Object["spec"] = spec

	// Submit Update
	_, updateErr := s.DynamicClient.Resource(webAppGVR).Namespace(namespace).Update(ctx, existing, metav1.UpdateOptions{})
	return updateErr

}