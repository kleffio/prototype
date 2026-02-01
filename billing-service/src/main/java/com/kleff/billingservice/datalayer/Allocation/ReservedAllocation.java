package com.kleff.billingservice.datalayer.Allocation;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.sql.Date;
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "reserved_allocations")
public class ReservedAllocation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String allocationId;
    String userId;
    String workspaceId;
    String projectId;
    Double cpuCores;
    Double memoryGb;
    Double storageGb;
    int containerLimit;
    Double monthlyPrice;
    Date startDate;
    Date endDate;

    // Fields for billing calculations (used by tests)
    private Double cpuHours;
    private Double memoryGbHours;
    private Double storageGbHours;

    // Methods for billing calculations
    public Double getCpuHours() {
        // If explicitly set, use that value; otherwise calculate from allocation period
        if (cpuHours != null) {
            return cpuHours;
        }
        if (startDate == null || endDate == null) {
            return 0.0;
        }
        long days = java.time.temporal.ChronoUnit.DAYS.between(
            startDate.toLocalDate(), 
            endDate.toLocalDate()
        );
        return cpuCores * days * 24; // 24 hours per day
    }

    public Double getMemoryGbHours() {
        // If explicitly set, use that value; otherwise calculate from allocation period
        if (memoryGbHours != null) {
            return memoryGbHours;
        }
        if (startDate == null || endDate == null) {
            return 0.0;
        }
        long days = java.time.temporal.ChronoUnit.DAYS.between(
            startDate.toLocalDate(), 
            endDate.toLocalDate()
        );
        return memoryGb * days * 24; // 24 hours per day
    }

    public Double getStorageGb() {
        // If explicitly set, use that value; otherwise use storageGb
        if (storageGbHours != null) {
            return storageGbHours;
        }
        return storageGb;
    }
}
