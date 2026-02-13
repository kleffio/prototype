package com.kleff.billingservice.datalayer.Record;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "UsageRecords")
public class UsageRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String usageId;
    String projectId;
    String containerId;
    PricingModel pricingModel;
    Double CPU_HOURS;
    Double MEMORY_GB_HOURS;
    Double  STORAGE_GB;
    LocalDateTime recordedAt;

}
