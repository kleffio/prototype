package com.kleff.projectmanagementservice.presentationlayer.project;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectActivityLogDTO {
    private String id;
    private String action;
    private String collaborator;
    private String resourceType;
    private Date timestamp;
    private String details;
}
