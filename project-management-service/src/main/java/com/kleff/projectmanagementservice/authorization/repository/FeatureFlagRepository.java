package com.kleff.projectmanagementservice.authorization.repository;

import com.kleff.projectmanagementservice.authorization.domain.FeatureFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for managing feature flags.
 * Used to control authorization shadow mode and enforce mode.
 */
@Repository
public interface FeatureFlagRepository extends JpaRepository<FeatureFlag, Integer> {

    /**
     * Find a feature flag by its key.
     *
     * @param flagKey The unique flag key (e.g., "authorization.shadow_mode")
     * @return Optional containing the feature flag if found
     */
    Optional<FeatureFlag> findByFlagKey(String flagKey);
}
