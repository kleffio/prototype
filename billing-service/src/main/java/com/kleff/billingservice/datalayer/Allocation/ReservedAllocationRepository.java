package com.kleff.billingservice.datalayer.Allocation;

import com.kleff.billingservice.datalayer.Record.UsageRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReservedAllocationRepository extends JpaRepository<ReservedAllocation, String> {
    
    List<ReservedAllocation> findByProjectId(String projectId);
}
