package com.kleff.projectmanagementservice.datalayer.collaborator;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.Set;

@Entity
@Table(name = "collaborators", uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "user_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Collaborator {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "project_id", nullable = false)
    private String projectId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private CollaboratorRole role;

    @Column(name = "custom_role_id")
    private Integer customRoleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CollaboratorStatus collaboratorStatus;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "collaborator_permissions", joinColumns = @JoinColumn(name = "collaborator_id"))
    @Column(name = "permission")
    @Enumerated(EnumType.STRING)
    private Set<ProjectPermission> permissions;

    @Column(name = "invited_by", nullable = false)
    private String invitedBy;

    @Column(name = "invited_at", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date invitedAt;

    @Column(name = "accepted_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date acceptedAt;

    @Column(name = "expires_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date expiresAt;

    @Column(name = "last_accessed_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date lastAccessedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Column(name = "updated_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    @PrePersist
    void onCreate() {
        Date now = new Date();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = new Date();
    }
}
