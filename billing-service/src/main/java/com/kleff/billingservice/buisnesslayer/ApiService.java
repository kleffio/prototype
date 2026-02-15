package com.kleff.billingservice.buisnesslayer;

import com.kleff.billingservice.datalayer.Record.UsageMonth;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
public class ApiService {

    @Value("${vite.backend.url}")
    private String backendUrl;

    private final RestClient restClient;

    public ApiService(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder
                .baseUrl(backendUrl)
                .build();
    }

    public List<String> getListOfProjectIds() {
        return restClient.get()
                .uri("api/v1/projects/ListID")
                .retrieve()
                .body(new ParameterizedTypeReference<List<String>>() {});
    }

    // GET request that returns a single JSON object
    public UsageMonth usageRecordForLastMonth(String id, int days) {
        return restClient.get()
                .uri("api/v1/systems/projects/{id}/{days}", id, days)
                .retrieve()
                .body(UsageMonth.class);
    }
}