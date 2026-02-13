package com.kleff.deployment.utils;

import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class RestClientConfig {

    @Bean
    public RestTemplate restTemplate() {
        CloseableHttpClient httpClient = HttpClients.createDefault();
        HttpComponentsClientHttpRequestFactory requestFactory = new HttpComponentsClientHttpRequestFactory(httpClient);
        requestFactory.setConnectTimeout(5000); // 5 seconds connect timeout
        requestFactory.setConnectionRequestTimeout(5000); // 5 seconds connection request timeout
        requestFactory.setReadTimeout(5000); // 5 seconds read timeout

        RestTemplate restTemplate = new RestTemplate(requestFactory);
        return restTemplate;
    }
}