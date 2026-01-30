package com.kleff.billingservice.presentationlayer;

import com.kleff.billingservice.buisnesslayer.BillingService;
import com.kleff.billingservice.datalayer.Allocation.ReservedAllocation;
import com.kleff.billingservice.datalayer.Invoice.Invoice;
import com.kleff.billingservice.datalayer.Pricing.Price;
import com.kleff.billingservice.datalayer.Record.UsageRecord;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/billing")
public class BillingController {

    private static final Logger logger = LoggerFactory.getLogger(BillingController.class);

    @Value("${frontend.url}")
    private String frontend;
    @Value("${vite.backend.url}")
    private String backendUrl;
    
    private final BillingService billingService;
    private final RestClient restClient;

    public BillingController(BillingService billingService, RestClient.Builder restClientBuilder, @Value("${vite.backend.url}") String backendUrl) {
        this.billingService = billingService;
        this.restClient = restClientBuilder.baseUrl(backendUrl).build();
        this.backendUrl = backendUrl;
    }
    
    private String getUserIdFromAuth(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            return jwt.getSubject();
        }
        throw new RuntimeException("User not authenticated");
    }
    
    private boolean hasPermission(String userId, String projectId, String permission, String authHeader) {
        try {
            String url = "/api/v1/collaborators/" + projectId + "/user/" + userId + "/permissions";
            logger.info("Checking permission '{}' for user {} on project {}", permission, userId, projectId);
            
            List<String> permissions = restClient.get()
                .uri(url)
                .header("Authorization", authHeader)
                .retrieve()
                .body(new ParameterizedTypeReference<List<String>>() {});
            
            boolean hasPermission = permissions != null && permissions.contains(permission);
            logger.info("User {} {} permission '{}' for project {}", userId, hasPermission ? "has" : "does not have", permission, projectId);
            return hasPermission;
        } catch (Exception e) {
            logger.error("Error checking permission for user {} on project {}: {}", userId, projectId, e.getMessage());
            return false;
        }
    }

    // Usage Record Endpoints
    @PostMapping("/usage-records/")
    public ResponseEntity<String> createUsageRecord(@RequestBody UsageRecord usageRecord) {
        billingService.createUsageRecord(usageRecord);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body("Usage record created successfully");
    }

    @GetMapping("/{projectId}/usage-records/")
    public ResponseEntity<?> getUsageRecordsForProject(
            @PathVariable String projectId,
            Authentication authentication,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String userId = getUserIdFromAuth(authentication);
            
            // Check if user has MANAGE_BILLING permission
            if (!hasPermission(userId, projectId, "MANAGE_BILLING", authHeader)) {
                logger.warn("User {} attempted to view usage records for project {} without MANAGE_BILLING permission", userId, projectId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You don't have permission to view billing information for this project"));
            }
            
            List<UsageRecord> records = billingService.getUsageRecordsForProject(projectId);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            logger.error("Error getting usage records for project {}: {}", projectId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to retrieve usage records"));
        }
    }

    @PostMapping("/pay/{invoiceId}")
    public ResponseEntity<?> payInvoice(
            @PathVariable String invoiceId,
            Authentication authentication,
            @RequestHeader("Authorization") String authHeader) {
        try {
            // Get userId first
            String userId = getUserIdFromAuth(authentication);
            
            // Get the invoice to find the project
            Invoice invoice = billingService.getInvoiceById(invoiceId);
            
            // Check if user has MANAGE_BILLING permission
            if (!hasPermission(userId, invoice.getProjectId(), "MANAGE_BILLING", authHeader)) {
                logger.warn("User {} attempted to pay invoice {} without MANAGE_BILLING permission", userId, invoiceId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You don't have permission to manage billing for this project"));
            }
            
            // Validate and compute amount server-side
            long amountCents = billingService.computeOutstandingCents(invoiceId);

            logger.info("Creating Stripe session for invoice: {} with amount: {} cents", invoiceId, amountCents);

            SessionCreateParams params = SessionCreateParams.builder()
                    .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .addLineItem(
                            SessionCreateParams.LineItem.builder()
                                    .setQuantity(1L)
                                    .setPriceData(
                                            SessionCreateParams.LineItem.PriceData.builder()
                                                    .setCurrency("usd")
                                                    .setUnitAmount(amountCents)
                                                    .setProductData(
                                                            SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                                    .setName("Invoice #" + invoiceId)
                                                                    .build()
                                                    )
                                                    .build()
                                    )
                                    .build()
                    )
                    .setSuccessUrl(frontend + "/projects/invoice/" + invoiceId + "?success=true&session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(frontend + "/projects/invoice/" + invoiceId)
                    .putMetadata("invoiceId", invoiceId)
                    .build();

            Session session = Session.create(params);

            Map<String, String> response = new HashMap<>();
            response.put("url", session.getUrl());
            response.put("sessionId", session.getId());
            return ResponseEntity.ok(response);

        } catch (EntityNotFoundException e) {
            logger.error("Invoice not found: {}", invoiceId, e);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            logger.error("Invalid argument for invoice: {}", invoiceId, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (StripeException e) {
            logger.error("Stripe error for invoice {}: {}", invoiceId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Payment processing error: " + e.getMessage()));
        } catch (Exception e) {
            logger.error("Unexpected error for invoice {}: {}", invoiceId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Unexpected error: " + e.getMessage()));
        }
    }

    // Reserved Allocation Endpoints
    @PostMapping("/reserved-allocations/")
    public ResponseEntity<String> createReservedAllocation(@RequestBody ReservedAllocation reservedAllocation) {
        billingService.createReservedAllocation(reservedAllocation);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body("Reserved allocation created successfully");
    }

    @GetMapping("/{projectId}/invoices/")
    public ResponseEntity<?> getInvoicesForProject(
            @PathVariable String projectId,
            Authentication authentication,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String userId = getUserIdFromAuth(authentication);
            
            // Check if user has MANAGE_BILLING permission
            if (!hasPermission(userId, projectId, "MANAGE_BILLING", authHeader)) {
                logger.warn("User {} attempted to view invoices for project {} without MANAGE_BILLING permission", userId, projectId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You don't have permission to view billing information for this project"));
            }
            
            List<Invoice> items = billingService.getInvoicesForAProject(projectId);
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            logger.error("Error getting invoices for project {}: {}", projectId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to retrieve invoices"));
        }
    }

    @PostMapping("/invoice")
    public ResponseEntity<String> createInvoice(@RequestBody Invoice invoice) {
        billingService.createInvoice(invoice);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body("Invoice created successfully");
    }

    @GetMapping("/prices")
    public List<Price> getPrices() {
        return billingService.getPrices();
    }

    @GetMapping("/notifications/{projectId}")
    public ResponseEntity<?> getNotificationsForProject(
            @PathVariable String projectId,
            Authentication authentication,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String userId = getUserIdFromAuth(authentication);

            // Check if user has MANAGE_BILLING permission
            if (!hasPermission(userId, projectId, "MANAGE_BILLING", authHeader)) {
                logger.warn("User {} attempted to view invoices for project {} without MANAGE_BILLING permission", userId, projectId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You don't have permission to view billing information for this project"));
            }

            List<Invoice> items = billingService.getNotificationsForProject(projectId);
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            logger.error("Error getting invoices for project {}: {}", projectId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve invoices"));
        }
    }

}