package com.kleff.billingservice.datalayer.Record;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UsageRecordRepository extends JpaRepository<UsageRecord, String> {
    public List<UsageRecord> findByContainerId(String containerId);
    public List<UsageRecord> findByProjectIdIs(String projectId);
    public List<UsageRecord> findByRecordedAtBetween(LocalDateTime start, LocalDateTime end);
}
