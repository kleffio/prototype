package com.kleff.deployment.data.container;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContainerResponseModel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String containerID;
    private String projectID;
    private String name;
    private String status;
    private String image;
    private int port;
    private LocalDateTime createdAt;
    private String repoUrl; 
    private String branch;
    private Map<String, String> envVariables;
}
