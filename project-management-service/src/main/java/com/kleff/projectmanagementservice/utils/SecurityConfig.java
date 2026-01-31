package com.kleff.projectmanagementservice.utils;

import com.kleff.projectmanagementservice.filter.DeactivationCheckFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http,
                        DeactivationCheckFilter deactivationCheckFilter) throws Exception {
                http
                                .csrf(csrf -> csrf.disable())
                                .cors(Customizer.withDefaults())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                                                .requestMatchers("/api/v1/audit/internal").permitAll()
                                                .anyRequest().authenticated())
                                .oauth2ResourceServer(oauth2 -> oauth2
                                                .jwt(Customizer.withDefaults()))
                                .addFilterAfter(deactivationCheckFilter, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        @Bean
        public JwtDecoder jwtDecoder() {
                String jwkSetUri = "https://auth.kleff.io/application/o/kleff/jwks/";
                String issuerUri = "https://auth.kleff.io/application/o/kleff/";

                System.out.println("🔐 Configuring JWT Decoder with increased timeout");
                System.out.println("   JWKS URI: " + jwkSetUri);
                System.out.println("   Issuer URI: " + issuerUri);

                // Create RestTemplate with increased timeouts
                SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
                requestFactory.setConnectTimeout(Duration.ofSeconds(10));
                requestFactory.setReadTimeout(Duration.ofSeconds(10));

                RestTemplate restTemplate = new RestTemplate(requestFactory);

                // Create the decoder with custom RestTemplate
                NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri)
                                .restOperations(restTemplate)
                                .build();

                // Create validators
                OAuth2TokenValidator<Jwt> issuerValidator = JwtValidators.createDefaultWithIssuer(issuerUri);
                OAuth2TokenValidator<Jwt> timestampValidator = new JwtTimestampValidator();

                // Combine validators
                OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
                                issuerValidator,
                                timestampValidator);

                jwtDecoder.setJwtValidator(validator);

                System.out.println("✅ JWT Decoder configured successfully with 10s timeouts");

                return jwtDecoder;
        }

        @Bean
        public RestTemplate restTemplate() {
                return new RestTemplate();
        }
}