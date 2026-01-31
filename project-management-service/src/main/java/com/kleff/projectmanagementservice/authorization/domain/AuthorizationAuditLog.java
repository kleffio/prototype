package com.kleff.projectmanagementservice.authorization.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Date;
import java.util.Map;

/**
 * Audit log entity for tracking all authorization decisions.
 * Records both ALLOW and DENY decisions for security analysis.
 */
@Entity
@Table(name = "authorization_audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthorizationAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "project_id")
    private String projectId;

    @Column(name = "action", nullable = false, length = 100)
    private String action;

    @Column(name = "resource_type", length = 50)
    private String resourceType;

    @Column(name = "resource_id")
    private String resourceId;

    @Column(name = "permission_checked", length = 100)
    private String permissionChecked;

    @Enumerated(EnumType.STRING)
    @Column(name = "authorization_result")
    private AuthorizationResult authorizationResult;

    @Column(name = "shadow_mode")
    private Boolean shadowMode;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "request_id", length = 100)
    private String requestId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "changes", columnDefinition = "json")
    private Map<String, Object> changes;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = new Date();
    }
}
