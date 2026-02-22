package domain

type TimeSeriesDataPoint struct {
	Timestamp int64   `json:"timestamp"`
	Value     float64 `json:"value"`
}

type ClusterOverview struct {
	TotalNodes         int     `json:"totalNodes"`
	RunningNodes       int     `json:"runningNodes"`
	TotalPods          int     `json:"totalPods"`
	TotalNamespaces    int     `json:"totalNamespaces"`
	CPUUsagePercent    float64 `json:"cpuUsagePercent"`
	MemoryUsagePercent float64 `json:"memoryUsagePercent"`
	UptimeSeconds      float64 `json:"uptimeSeconds"`
	UptimeFormatted    string  `json:"uptimeFormatted"`
}

type MetricCard struct {
	Title         string                `json:"title"`
	Value         string                `json:"value"`
	RawValue      float64               `json:"rawValue"`
	ChangePercent string                `json:"changePercent"`
	ChangeLabel   string                `json:"changeLabel"`
	Status        string                `json:"status"`
	Sparkline     []TimeSeriesDataPoint `json:"sparkline"`
}

type ResourceUtilization struct {
	CurrentValue  float64               `json:"currentValue"`
	ChangePercent float64               `json:"changePercent"`
	Trend         string                `json:"trend"`
	History       []TimeSeriesDataPoint `json:"history"`
}

type NodeMetric struct {
	Name               string  `json:"name"`
	CPUUsagePercent    float64 `json:"cpuUsagePercent"`
	MemoryUsagePercent float64 `json:"memoryUsagePercent"`
	PodCount           int     `json:"podCount"`
	Status             string  `json:"status"`
	UptimeSeconds      float64 `json:"uptimeSeconds"`
	UptimeFormatted    string  `json:"uptimeFormatted"`
}

type NamespaceMetric struct {
	Name        string  `json:"name"`
	PodCount    int     `json:"podCount"`
	CPUUsage    float64 `json:"cpuUsage"`
	MemoryUsage float64 `json:"memoryUsage"`
}

type DatabaseMetrics struct {
	DiskReadBytesPerSec  float64               `json:"diskReadBytesPerSec"`
	DiskWriteBytesPerSec float64               `json:"diskWriteBytesPerSec"`
	DiskReadOpsPerSec    float64               `json:"diskReadOpsPerSec"`
	DiskWriteOpsPerSec   float64               `json:"diskWriteOpsPerSec"`
	DiskReadHistory      []TimeSeriesDataPoint `json:"diskReadHistory"`
	DiskWriteHistory     []TimeSeriesDataPoint `json:"diskWriteHistory"`
	Source               string                `json:"source"`
}

type ProjectUsageMetrics struct {
	ProjectID            string  `json:"projectID"`
	MemoryUsageGB        float64 `json:"memoryUsageGB"`
	CPURequestCores      float64 `json:"cpuRequestCores"`
	DiskReadBytesPerSec  float64 `json:"diskReadBytesPerSec"`
	DiskWriteBytesPerSec float64 `json:"diskWriteBytesPerSec"`
	Window               string  `json:"window"`
}

type ProjectTotalUsageMetrics struct {
	ProjectID     string  `json:"projectID"`
	CPUHours      float64 `json:"cpuHours"`
	MemoryGBHours float64 `json:"memoryGBHours"`
	Window        string  `json:"window"`
}

type UptimeMetrics struct {
	SystemUptimeSeconds    float64               `json:"systemUptimeSeconds"`
	SystemUptimeFormatted  string                `json:"systemUptimeFormatted"`
	NodeUptimes            []NodeUptimeMetric    `json:"nodeUptimes"`
	AverageUptimeSeconds   float64               `json:"averageUptimeSeconds"`
	AverageUptimeFormatted string                `json:"averageUptimeFormatted"`
	UptimeHistory          []TimeSeriesDataPoint `json:"uptimeHistory"`
}

type NodeUptimeMetric struct {
	NodeName         string  `json:"nodeName"`
	UptimeSeconds    float64 `json:"uptimeSeconds"`
	UptimeFormatted  string  `json:"uptimeFormatted"`
	BootTimestamp    int64   `json:"bootTimestamp"`
	BootTimeReadable string  `json:"bootTimeReadable"`
}

type AggregatedMetrics struct {
	Overview              *ClusterOverview     `json:"overview"`
	RequestsMetric        *MetricCard          `json:"requestsMetric"`
	PodsMetric            *MetricCard          `json:"podsMetric"`
	NodesMetric           *MetricCard          `json:"nodesMetric"`
	TenantsMetric         *MetricCard          `json:"tenantsMetric"`
	CPUUtilization        *ResourceUtilization `json:"cpuUtilization"`
	MemoryUtilization     *ResourceUtilization `json:"memoryUtilization"`
	Nodes                 []NodeMetric         `json:"nodes"`
	Namespaces            []NamespaceMetric    `json:"namespaces"`
	DatabaseIOMetrics     *DatabaseMetrics     `json:"databaseIOMetrics"`
	UptimeMetrics         *UptimeMetrics       `json:"uptimeMetrics"`
	SystemUptime          float64              `json:"systemUptime"`
	SystemUptimeFormatted string               `json:"systemUptimeFormatted"`
}

type TopProjectsRequest struct {
	SortBy   string `form:"sortBy" binding:"omitempty,oneof=cpu memory disk"`
	Limit    int    `form:"limit" binding:"omitempty,min=1,max=50"`
	Duration string `form:"duration" binding:"omitempty"`
}

type TopProjectsResponse struct {
	Projects             []ProjectRanking `json:"projects"`
	TotalClusterCPU      float64          `json:"totalClusterCpuCores"`
	TotalClusterMemory   float64          `json:"totalClusterMemoryGB"`
	CurrentCPUPercent    float64          `json:"currentCpuPercent"`
	CurrentMemoryPercent float64          `json:"currentMemoryPercent"`
	Alert                *ResourceAlert   `json:"alert,omitempty"`
	Cache                *CacheMetrics    `json:"cache,omitempty"`
}

type ResourceAlert struct {
	Type         string  `json:"type"`
	CurrentValue float64 `json:"currentValue"`
	Threshold    float64 `json:"threshold"`
	Message      string  `json:"message"`
}

type ProjectRanking struct {
	ProjectID                 string  `json:"projectId"`
	ProjectName               string  `json:"projectName"`
	OwnerID                   string  `json:"ownerId"`
	OwnerName                 string  `json:"ownerName"`
	Namespace                 string  `json:"namespace"`
	CPURequestCores           float64 `json:"cpuRequestCores"`
	MemoryUsageGB             float64 `json:"memoryUsageGB"`
	DiskReadBytesPerSec       float64 `json:"diskReadBytesPerSec"`
	DiskWriteBytesPerSec      float64 `json:"diskWriteBytesPerSec"`
	PercentageOfClusterCPU    float64 `json:"percentageOfClusterCpu"`
	PercentageOfClusterMemory float64 `json:"percentageOfClusterMemory"`
}

type CacheMetrics struct {
	ProjectCacheHits   uint64 `json:"projectCacheHits"`
	ProjectCacheMisses uint64 `json:"projectCacheMisses"`
	UserCacheHits      uint64 `json:"userCacheHits"`
	UserCacheMisses    uint64 `json:"userCacheMisses"`
}
