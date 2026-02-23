package com.kleff.projectmanagementservice.datalayer.project;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, String> {
    Project findByProjectId(String projectId);

    List<Project> findByOwnerIdEquals(String userId);

    @Query("SELECT p.projectId FROM Project p")
    List<String> getAllProjectIds();

    /**
     * Admin-only: Search projects by name, description, or owner ID.
     */
    @Query("SELECT p FROM Project p WHERE " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.ownerId) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Project> findAllWithSearch(@Param("search") String search, Pageable pageable);
}
