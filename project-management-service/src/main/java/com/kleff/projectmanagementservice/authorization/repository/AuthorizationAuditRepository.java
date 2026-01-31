package com.kleff.projectmanagementservice.authorization.repository;

import com.kleff.projectmanagementservice.authorization.domain.AuthorizationAuditLog;
import com.kleff.projectmanagementservice.authorization.domain.AuthorizationResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;

/**
 * Repository for managing authorization audit logs.
 * Tracks all authorization decisions for security analysis.
 */
@Repository
public interface AuthorizationAuditRepository extends JpaRepository<AuthorizationAuditLog, Long> {

    /**
     * Find all audit logs for a specific user, ordered by most recent first.
     *
     * @param userId The user ID to search for
     * @return List of audit logs for the user
     */
    List<AuthorizationAuditLog> findByUserIdOrderByCreatedAtDesc(String userId);

    /**
     * Find all audit logs for a specific project, ordered by most recent first.
     *
     * @param projectId The project ID to search for
     * @return List of audit logs for the project
     */
    List<AuthorizationAuditLog> findByProjectIdOrderByCreatedAtDesc(String projectId);

    /**
     * Find the most recent 100 audit logs (for admin dashboard).
     *
     * @return List of the 100 most recent audit logs
     */
    List<AuthorizationAuditLog> findTop100ByOrderByCreatedAtDesc();

    /**
     * Find all denied authorization attempts (for security monitoring).
     *
     * @param result The authorization result to filter by
     * @param since Only include logs after this date
     * @return List of denied authorization attempts
     */
    @Query("SELECT a FROM AuthorizationAuditLog a " +
           "WHERE a.authorizationResult = :result " +
           "AND a.createdAt >= :since " +
           "ORDER BY a.createdAt DESC")
    List<AuthorizationAuditLog> findByResultSince(
        @Param("result") AuthorizationResult result,
        @Param("since") Date since
    );

    /**
     * Count authorization attempts by user.
     *
     * @param userId The user ID to count
     * @return Number of authorization checks for this user
     */
    long countByUserId(String userId);
}
