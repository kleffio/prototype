package com.kleff.billingservice;

import com.kleff.billingservice.buisnesslayer.BillingService;
import com.kleff.billingservice.datalayer.Invoice.Invoice;
import com.kleff.billingservice.datalayer.Pricing.Price;
import com.kleff.billingservice.presentationlayer.BillingController;
import com.stripe.exception.ApiConnectionException;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BillingControllerTest {

    @Mock private BillingService billingService;
    @Mock private RestClient.Builder restClientBuilder;
    @Mock private RestClient restClient;

    // RestClient Fluent Chain Mocks
    @Mock private RestClient.RequestHeadersUriSpec requestHeadersUriSpec;
    @Mock private RestClient.RequestHeadersSpec requestHeadersSpec;
    @Mock private RestClient.ResponseSpec responseSpec;

    private BillingController billingController;

    private final String USER_ID = "user-123";
    private final String PROJECT_ID = "proj-1";
    private final String AUTH_HEADER = "Bearer token";
    private final String BACKEND_URL = "http://localhost:8080/";
    private final String FRONTEND_URL = "http://localhost:3000";

    @BeforeEach
    void setUp() {
        // Prepare RestClient builder for Constructor injection
        lenient().when(restClientBuilder.baseUrl(anyString())).thenReturn(restClientBuilder);
        lenient().when(restClientBuilder.build()).thenReturn(restClient);

        billingController = new BillingController(billingService, restClientBuilder, BACKEND_URL);

        // Set @Value fields
        ReflectionTestUtils.setField(billingController, "frontend", FRONTEND_URL);
    }

    private Authentication mockAuth() {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn(USER_ID);
        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(jwt);
        return auth;
    }

    // --- SECTION 1: PERMISSION LOGIC (hasPermission) ---

    @Test
    @DisplayName("hasPermission - Returns true when API returns correct role")
    void hasPermission_Success() {
        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(any(ParameterizedTypeReference.class))).thenReturn(List.of("MANAGE_BILLING"));

        boolean result = billingController.hasPermission(USER_ID, PROJECT_ID, "MANAGE_BILLING", AUTH_HEADER);
        assertTrue(result);
    }

    @Test
    @DisplayName("hasPermission - Returns false when API fails")
    void hasPermission_Failure() {
        when(restClient.get()).thenThrow(new RuntimeException("Connection Refused"));
        boolean result = billingController.hasPermission(USER_ID, PROJECT_ID, "MANAGE_BILLING", AUTH_HEADER);
        assertFalse(result);
    }

    // --- SECTION 2: STRIPE & PAYMENTS ---

    @Test
    @DisplayName("payInvoice - Successfully creates Stripe session")
    void payInvoice_Success() throws StripeException {
        Authentication auth = mockAuth();
        Invoice invoice = new Invoice();
        invoice.setProjectId(PROJECT_ID);

        when(billingService.getInvoiceById("inv-1")).thenReturn(invoice);
        when(billingService.computeOutstandingCents("inv-1")).thenReturn(5000L);

        BillingController spyController = spy(billingController);
        doReturn(true).when(spyController).hasPermission(any(), any(), any(), any());

        try (MockedStatic<Session> mockedSession = mockStatic(Session.class)) {
            Session sessionMock = mock(Session.class);
            when(sessionMock.getUrl()).thenReturn("http://stripe.url");
            when(sessionMock.getId()).thenReturn("sess_123");
            mockedSession.when(() -> Session.create(any(SessionCreateParams.class))).thenReturn(sessionMock);

            ResponseEntity<?> response = spyController.payInvoice("inv-1", auth, AUTH_HEADER);
            assertEquals(HttpStatus.OK, response.getStatusCode());
        }
    }

    @Test
    @DisplayName("payInvoice - Returns 403 when permission denied")
    void payInvoice_Forbidden() {
        Authentication auth = mockAuth();
        Invoice invoice = new Invoice();
        invoice.setProjectId(PROJECT_ID);
        when(billingService.getInvoiceById("inv-1")).thenReturn(invoice);

        BillingController spyController = spy(billingController);
        doReturn(false).when(spyController).hasPermission(any(), any(), any(), any());

        ResponseEntity<?> response = spyController.payInvoice("inv-1", auth, AUTH_HEADER);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("handlePaymentSuccess - Successful redirect after payment")
    void handlePaymentSuccess_Paid() throws StripeException {
        Authentication auth = mockAuth();
        Invoice inv = new Invoice();
        inv.setProjectId(PROJECT_ID);

        Session sessionMock = mock(Session.class);
        when(sessionMock.getPaymentStatus()).thenReturn("paid");
        when(sessionMock.getMetadata()).thenReturn(Map.of("invoiceId", "inv-1"));
        when(billingService.getInvoiceById("inv-1")).thenReturn(inv);

        BillingController spyController = spy(billingController);
        doReturn(true).when(spyController).hasPermission(any(), any(), any(), any());

        try (MockedStatic<Session> mockedSession = mockStatic(Session.class)) {
            mockedSession.when(() -> Session.retrieve("sess_123")).thenReturn(sessionMock);
            ResponseEntity<?> response = spyController.handlePaymentSuccess("sess_123", auth, AUTH_HEADER);
            assertEquals(HttpStatus.FOUND, response.getStatusCode());
        }
    }

    // --- SECTION 3: ERROR HANDLING & EDGE CASES ---

//    @Test
//    @DisplayName("getUserIdFromAuth - Returns 500 when Authentication is invalid due to global try-catch")
//    void getUserId_AuthError_Returns500() {
//        // Arrange: Mock authentication that is NOT a Jwt principal
//        Authentication invalidAuth = mock(Authentication.class);
//        when(invalidAuth.getPrincipal()).thenReturn("NotAJwtObject");
//
//        // Act
//        ResponseEntity<?> response = billingController.getAllNotifications(invalidAuth, AUTH_HEADER);
//
//        // Assert
//        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
//        // Verify the error message matches the exception thrown inside
//        Map<String, String> body = (Map<String, String>) response.getBody();
//        assertNotNull(body);
//        assertTrue(body.get("error").contains("User not authenticated"));
//    }

    @Test
    @DisplayName("payInvoice - Allows payment if permission service is down (deleted project branch)")
    void payInvoice_PermissionServiceDown_AllowsPayment() throws StripeException {
        Authentication auth = mockAuth();
        Invoice invoice = new Invoice();
        invoice.setProjectId(PROJECT_ID);

        when(billingService.getInvoiceById("inv-1")).thenReturn(invoice);
        when(billingService.computeOutstandingCents("inv-1")).thenReturn(1000L);

        BillingController spyController = spy(billingController);
        doThrow(new RuntimeException("Service Down")).when(spyController).hasPermission(any(), any(), any(), any());

        try (MockedStatic<Session> mockedSession = mockStatic(Session.class)) {
            Session sessionMock = mock(Session.class);
            when(sessionMock.getUrl()).thenReturn("http://stripe.url");
            mockedSession.when(() -> Session.create(any(SessionCreateParams.class))).thenReturn(sessionMock);

            ResponseEntity<?> response = spyController.payInvoice("inv-1", auth, AUTH_HEADER);
            assertEquals(HttpStatus.OK, response.getStatusCode());
        }
    }

    @Test
    @DisplayName("generateFinalInvoice - Returns 404 when project missing")
    void generateFinalInvoice_NotFound() {
        Authentication auth = mockAuth();
        BillingController spyController = spy(billingController);
        doReturn(true).when(spyController).hasPermission(any(), any(), any(), any());

        when(billingService.generateFinalInvoice(any(), any(), any())).thenThrow(new EntityNotFoundException("Missing"));
        ResponseEntity<?> response = spyController.generateFinalInvoice(PROJECT_ID, auth, AUTH_HEADER);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    // --- SECTION 4: BASIC GETTERS/SETTERS ---

    @Test
    void getPrices_ReturnsPopulatedList() {
        when(billingService.getPrices()).thenReturn(List.of(new Price()));
        List<Price> prices = billingController.getPrices();
        assertFalse(prices.isEmpty());
    }

    @Test
    void createInvoice_ReturnsCreatedStatus() {
        ResponseEntity<String> response = billingController.createInvoice(new Invoice());
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
    }
}
