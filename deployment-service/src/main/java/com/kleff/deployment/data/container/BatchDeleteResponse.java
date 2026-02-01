package com.kleff.deployment.data.container;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchDeleteResponse {
    private List<String> deleted;
    private List<FailedItem> failed;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FailedItem {
        private String containerID;
        private String reason;
    }
}