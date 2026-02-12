package com.kleff.billingservice.datalayer.Record;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsageMonth {
    String projectID;
    double memoryUsageGB;
    double cpuRequestCores;
    int window;
}
