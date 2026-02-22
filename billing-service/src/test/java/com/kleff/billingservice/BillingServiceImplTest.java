package com.kleff.billingservice;

import com.kleff.billingservice.buisnesslayer.ApiService;
import com.kleff.billingservice.buisnesslayer.BillingServiceImpl;
import com.kleff.billingservice.datalayer.Allocation.ReservedAllocation;
import com.kleff.billingservice.datalayer.Allocation.ReservedAllocationRepository;
import com.kleff.billingservice.datalayer.Invoice.Invoice;
import com.kleff.billingservice.datalayer.Invoice.InvoiceRepository;
import com.kleff.billingservice.datalayer.Invoice.InvoiceStatus;
import com.kleff.billingservice.datalayer.Pricing.Price;
import com.kleff.billingservice.datalayer.Pricing.PriceRepository;
import com.kleff.billingservice.datalayer.Record.UsageMonth;
import com.kleff.billingservice.datalayer.Record.UsageRecordRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BillingServiceImplTest {

    @Mock
    private ReservedAllocationRepository reservedAllocationRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private UsageRecordRepository usageRecordRepository;

    @Mock
    private PriceRepository priceRepository;

    @Mock
    private ApiService apiService;

    @Mock
    private RestClient restClient;

    @Mock
    private RestClient.Builder restClientBuilder;

    @Mock
    private RestClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private RestClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;


    @InjectMocks
    private BillingServiceImpl billingService;

    private static final String TEST_PROJECT_ID = "project-123";
    private static final String TEST_INVOICE_ID = "invoice-456";
    private static final String TEST_USER_ID = "user-789";
    private static final String AUTH_HEADER = "Bearer test-token";

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(restClientBuilder.build()).thenReturn(restClient);
        billingService = new BillingServiceImpl(
                reservedAllocationRepository,
                invoiceRepository,
                priceRepository,
                apiService,
                restClientBuilder
        );
    }

    // Helper methods
    private Invoice createTestInvoice() {
        return Invoice.builder()
                .invoiceId(TEST_INVOICE_ID)
                .projectId(TEST_PROJECT_ID)
                .status(InvoiceStatus.OPEN)
                .startDate(Date.valueOf(LocalDate.now().minusMonths(1)))
                .endDate(Date.valueOf(LocalDate.now()))
                .totalCPU(BigDecimal.valueOf(100.00))
                .totalRAM(BigDecimal.valueOf(50.00))
                .totalSTORAGE(BigDecimal.valueOf(25.00))
                .subtotal(BigDecimal.valueOf(175.00))
                .taxes(BigDecimal.valueOf(20.12))
                .total(BigDecimal.valueOf(195.12))
                .totalPaid(BigDecimal.ZERO)
                .build();
    }


    private Price createTestPrice(String metric, double price) {
        Price p = new Price();
        p.setMetric(metric);
        p.setPrice(price);
        return p;
    }

    // =========================
    // Invoice Creation Tests
    // =========================

    @Test
    void testCreateInvoice_Success() {
        Invoice invoice = createTestInvoice();
        when(invoiceRepository.save(any(Invoice.class))).thenReturn(invoice);

        Invoice result = billingService.createInvoice(invoice);

        assertNotNull(result);
        assertEquals(BigDecimal.ZERO, result.getTotalPaid());
        verify(invoiceRepository, times(1)).save(invoice);
    }


    // =========================
    // Invoice Payment Tests
    // =========================

    @Test
    void testPayInvoice_Success() {
        Invoice invoice = createTestInvoice();
        when(invoiceRepository.findByInvoiceId(TEST_INVOICE_ID)).thenReturn(invoice);
        when(invoiceRepository.save(any(Invoice.class))).thenReturn(invoice);

        billingService.payInvoice(TEST_INVOICE_ID);

        assertEquals(InvoiceStatus.PAID, invoice.getStatus());
        verify(invoiceRepository, times(1)).findByInvoiceId(TEST_INVOICE_ID);
        verify(invoiceRepository, times(1)).save(invoice);
    }

    @Test
    void testPayInvoice_Failure() {
        when(invoiceRepository.findByInvoiceId(TEST_INVOICE_ID))
                .thenThrow(new RuntimeException("Database error"));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            billingService.payInvoice(TEST_INVOICE_ID);
        });

        assertEquals("Payment registry failed", exception.getMessage());
    }

    @Test
    void testComputeOutstandingCents_Success() {
        Invoice invoice = createTestInvoice();
        when(invoiceRepository.findById(TEST_INVOICE_ID)).thenReturn(Optional.of(invoice));

        long result = billingService.computeOutstandingCents(TEST_INVOICE_ID);

        assertEquals(19512L, result); // $195.12 in cents
        verify(invoiceRepository, times(1)).findById(TEST_INVOICE_ID);
    }

    @Test
    void testComputeOutstandingCents_InvoiceNotFound() {
        when(invoiceRepository.findById(TEST_INVOICE_ID)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> {
            billingService.computeOutstandingCents(TEST_INVOICE_ID);
        });
    }

    @Test
    void testComputeOutstandingCents_AlreadyPaid() {
        Invoice invoice = createTestInvoice();
        invoice.setStatus(InvoiceStatus.PAID);
        when(invoiceRepository.findById(TEST_INVOICE_ID)).thenReturn(Optional.of(invoice));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            billingService.computeOutstandingCents(TEST_INVOICE_ID);
        });

        assertEquals("Invoice is already paid", exception.getMessage());
    }

    @Test
    void testComputeOutstandingCents_VoidInvoice() {
        Invoice invoice = createTestInvoice();
        invoice.setStatus(InvoiceStatus.VOID);
        when(invoiceRepository.findById(TEST_INVOICE_ID)).thenReturn(Optional.of(invoice));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            billingService.computeOutstandingCents(TEST_INVOICE_ID);
        });

        assertEquals("Invoice is cancelled", exception.getMessage());
    }

    @Test
    void testComputeOutstandingCents_NoOutstandingBalance() {
        Invoice invoice = createTestInvoice();
        invoice.setTotalPaid(invoice.getTotal());
        when(invoiceRepository.findById(TEST_INVOICE_ID)).thenReturn(Optional.of(invoice));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            billingService.computeOutstandingCents(TEST_INVOICE_ID);
        });

        assertEquals("No outstanding balance on this invoice", exception.getMessage());
    }

    @Test
    void testComputeOutstandingCents_AmountTooSmall() {
        Invoice invoice = createTestInvoice();
        invoice.setTotal(BigDecimal.valueOf(0.25));
        when(invoiceRepository.findById(TEST_INVOICE_ID)).thenReturn(Optional.of(invoice));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            billingService.computeOutstandingCents(TEST_INVOICE_ID);
        });

        assertEquals("Amount too small for payment processing", exception.getMessage());
    }

    @Test
    void testComputeOutstandingCents_NullTotalPaid() {
        Invoice invoice = createTestInvoice();
        invoice.setTotalPaid(null);
        when(invoiceRepository.findById(TEST_INVOICE_ID)).thenReturn(Optional.of(invoice));

        long result = billingService.computeOutstandingCents(TEST_INVOICE_ID);

        assertEquals(19512L, result); // Should handle null as zero
    }

    @Test
    void testMarkInvoiceAsPaid_Success() {
        Invoice invoice = createTestInvoice();
        when(invoiceRepository.findById(TEST_INVOICE_ID)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any(Invoice.class))).thenReturn(invoice);

        billingService.markInvoiceAsPaid(TEST_INVOICE_ID, "session-123");

        assertEquals(InvoiceStatus.PAID, invoice.getStatus());
        assertNotNull(invoice.getPaymentDate());
        verify(invoiceRepository, times(1)).save(invoice);
    }

    @Test
    void testMarkInvoiceAsPaid_AlreadyPaid() {
        Invoice invoice = createTestInvoice();
        invoice.setStatus(InvoiceStatus.PAID);
        when(invoiceRepository.findById(TEST_INVOICE_ID)).thenReturn(Optional.of(invoice));

        billingService.markInvoiceAsPaid(TEST_INVOICE_ID, "session-123");

        verify(invoiceRepository, never()).save(any(Invoice.class));
    }

    // =========================
    // Reserved Allocation Tests
    // =========================

    @Test
    void testCreateReservedAllocation_Success() {
        ReservedAllocation allocation = new ReservedAllocation();
        allocation.setProjectId(TEST_PROJECT_ID);
        when(reservedAllocationRepository.save(any(ReservedAllocation.class))).thenReturn(allocation);

        billingService.createReservedAllocation(allocation);

        verify(reservedAllocationRepository, times(1)).save(allocation);
    }

    // =========================
    // Invoice Retrieval Tests
    // =========================

    @Test
    void testGetInvoicesForAProject_Success() {
        List<Invoice> invoices = Arrays.asList(createTestInvoice());
        when(invoiceRepository.findByProjectId(TEST_PROJECT_ID)).thenReturn(invoices);

        List<Invoice> result = billingService.getInvoicesForAProject(TEST_PROJECT_ID);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(invoiceRepository, times(1)).findByProjectId(TEST_PROJECT_ID);
    }

    @Test
    void testGetInvoiceById_Success() {
        Invoice invoice = createTestInvoice();
        when(invoiceRepository.findById(TEST_INVOICE_ID)).thenReturn(Optional.of(invoice));

        Invoice result = billingService.getInvoiceById(TEST_INVOICE_ID);

        assertNotNull(result);
        assertEquals(TEST_INVOICE_ID, result.getInvoiceId());
    }

    @Test
    void testGetInvoiceById_NotFound() {
        when(invoiceRepository.findById(TEST_INVOICE_ID)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> {
            billingService.getInvoiceById(TEST_INVOICE_ID);
        });
    }

    // =========================
    // Price Tests
    // =========================

    @Test
    void testGetPrice_Success() {
        Price price = createTestPrice("CPU_HOURS", 0.05);
        when(priceRepository.findById("CPU_HOURS")).thenReturn(Optional.of(price));

        Price result = billingService.getPrice("CPU_HOURS");

        assertNotNull(result);
        assertEquals("CPU_HOURS", result.getMetric());
        assertEquals(0.05, result.getPrice());
    }

    @Test
    void testGetPrice_NotFound() {
        when(priceRepository.findById("CPU_HOURS")).thenReturn(Optional.empty());

        Price result = billingService.getPrice("CPU_HOURS");

        assertNull(result);
    }

    @Test
    void testGetPrices_Success() {
        List<Price> prices = Arrays.asList(
                createTestPrice("CPU_HOURS", 0.05),
                createTestPrice("MEMORY_GB_HOURS", 0.03)
        );
        when(priceRepository.findAll()).thenReturn(prices);

        List<Price> result = billingService.getPrices();

        assertNotNull(result);
        assertEquals(2, result.size());
    }

    @Test
    void testSetPrice_Success() {
        Price existingPrice = createTestPrice("CPU_HOURS", 0.05);
        Price newPrice = createTestPrice("CPU_HOURS", 0.06);

        when(priceRepository.findByMetric("CPU_HOURS")).thenReturn(existingPrice);
        when(priceRepository.save(any(Price.class))).thenReturn(existingPrice);

        billingService.setPrice(newPrice);

        assertEquals(0.06, existingPrice.getPrice());
        verify(priceRepository, times(1)).save(existingPrice);
    }

    // =========================
    // Notification Tests
    // =========================

    @Test
    void testGetNotificationsForProject_Success() {
        Invoice openInvoice = createTestInvoice();
        openInvoice.setStatus(InvoiceStatus.OPEN);

        Invoice overdueInvoice = createTestInvoice();
        overdueInvoice.setInvoiceId("invoice-overdue");
        overdueInvoice.setStatus(InvoiceStatus.OVERDUE);

        Invoice paidInvoice = createTestInvoice();
        paidInvoice.setInvoiceId("invoice-paid");
        paidInvoice.setStatus(InvoiceStatus.PAID);

        List<Invoice> allInvoices = Arrays.asList(openInvoice, overdueInvoice, paidInvoice);
        when(invoiceRepository.findByProjectId(TEST_PROJECT_ID)).thenReturn(allInvoices);

        List<Invoice> result = billingService.getNotificationsForProject(TEST_PROJECT_ID);

        assertEquals(2, result.size()); // Should only return OPEN and OVERDUE
        assertTrue(result.stream().allMatch(inv ->
                inv.getStatus() == InvoiceStatus.OPEN ||
                        inv.getStatus() == InvoiceStatus.OVERDUE ||
                        inv.getStatus() == InvoiceStatus.UNPAID
        ));
    }

    @Test
    void testGetAllNotificationsForUser_Success() {
        List<String> projectIds = Arrays.asList("project-1", "project-2");

        Invoice openInvoice = createTestInvoice();
        openInvoice.setStatus(InvoiceStatus.OPEN);

        when(invoiceRepository.findByProjectIdIn(projectIds)).thenReturn(Arrays.asList(openInvoice));

        List<Invoice> result = billingService.getAllNotificationsForUser(projectIds);

        assertEquals(1, result.size());
        assertEquals(InvoiceStatus.OPEN, result.get(0).getStatus());
    }

    @Test
    void testGetAllNotificationsForUserWithAuth_Success() {
        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(any(ParameterizedTypeReference.class)))
                .thenReturn(Arrays.asList("MANAGE_BILLING"));

        Invoice invoice = createTestInvoice();
        invoice.setStatus(InvoiceStatus.OPEN);
        when(invoiceRepository.findAll()).thenReturn(Arrays.asList(invoice));

        List<Invoice> result = billingService.getAllNotificationsForUser(TEST_USER_ID, AUTH_HEADER);

        assertNotNull(result);
        assertEquals(1, result.size());
    }

    @Test
    void testGetAllNotificationsForUserWithAuth_DeletedProject() {
        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(any(ParameterizedTypeReference.class)))
                .thenThrow(new RuntimeException("Project not found"));

        Invoice invoice = createTestInvoice();
        invoice.setStatus(InvoiceStatus.OPEN);
        when(invoiceRepository.findAll()).thenReturn(Arrays.asList(invoice));

        List<Invoice> result = billingService.getAllNotificationsForUser(TEST_USER_ID, AUTH_HEADER);

        // Should still include invoice from deleted project
        assertNotNull(result);
        assertEquals(1, result.size());
    }

    // =========================
    // Monthly Usage Tests
    // =========================

    @Test
    void testGetLastsMonthUsageRecordsAverage_Success() {
        UsageMonth usageMonth = new UsageMonth();
        usageMonth.setCpuRequestCores(10.0);
        usageMonth.setMemoryUsageGB(20.0);

        when(apiService.usageRecordForLastMonth(TEST_PROJECT_ID, 30)).thenReturn(usageMonth);
        when(priceRepository.findById("CPU_HOURS")).thenReturn(Optional.of(createTestPrice("CPU_HOURS", 0.05)));
        when(priceRepository.findById("MEMORY_GB_HOURS")).thenReturn(Optional.of(createTestPrice("MEMORY_GB_HOURS", 0.03)));
        when(priceRepository.findById("STORAGE_GB")).thenReturn(Optional.of(createTestPrice("STORAGE_GB", 0.01)));

        Invoice result = billingService.getLastsMonthUsageRecordsAverage(TEST_PROJECT_ID, 30);

        assertNotNull(result);
        assertNotNull(result.getTotalCPU());
        assertNotNull(result.getTotalRAM());
        assertNotNull(result.getTotal());
        assertEquals(BigDecimal.ZERO, result.getTotalPaid());
    }

    @Test
    void testGetLastsMonthUsageRecordsAverage_MissingPrice() {
        UsageMonth usageMonth = new UsageMonth();
        usageMonth.setCpuRequestCores(10.0);
        usageMonth.setMemoryUsageGB(20.0);

        when(apiService.usageRecordForLastMonth(TEST_PROJECT_ID, 30)).thenReturn(usageMonth);
        when(priceRepository.findById("CPU_HOURS")).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> {
            billingService.getLastsMonthUsageRecordsAverage(TEST_PROJECT_ID, 30);
        });
    }

    // =========================
    // Scheduled Tasks Tests
    // =========================

    @Test
    void testCreateMonthlyBills_Success() {
        List<String> projectIds = Arrays.asList(TEST_PROJECT_ID);
        UsageMonth usageMonth = new UsageMonth();
        usageMonth.setCpuRequestCores(10.0);
        usageMonth.setMemoryUsageGB(20.0);

        when(apiService.getListOfProjectIds()).thenReturn(projectIds);
        when(apiService.usageRecordForLastMonth(eq(TEST_PROJECT_ID), anyInt())).thenReturn(usageMonth);
        when(priceRepository.findById("CPU_HOURS")).thenReturn(Optional.of(createTestPrice("CPU_HOURS", 0.05)));
        when(priceRepository.findById("MEMORY_GB_HOURS")).thenReturn(Optional.of(createTestPrice("MEMORY_GB_HOURS", 0.03)));
        when(priceRepository.findById("STORAGE_GB")).thenReturn(Optional.of(createTestPrice("STORAGE_GB", 0.01)));
        when(invoiceRepository.save(any(Invoice.class))).thenReturn(createTestInvoice());

        billingService.CreateMonthlyBills();

        verify(invoiceRepository, times(1)).save(any(Invoice.class));
    }

    @Test
    void testCreateMonthlyBills_WithFailure() {
        List<String> projectIds = Arrays.asList(TEST_PROJECT_ID, "project-fail");
        UsageMonth usageMonth = new UsageMonth();
        usageMonth.setCpuRequestCores(10.0);
        usageMonth.setMemoryUsageGB(20.0);

        when(apiService.getListOfProjectIds()).thenReturn(projectIds);
        when(apiService.usageRecordForLastMonth(eq(TEST_PROJECT_ID), anyInt())).thenReturn(usageMonth);
        when(apiService.usageRecordForLastMonth(eq("project-fail"), anyInt()))
                .thenThrow(new RuntimeException("API error"));
        when(priceRepository.findById("CPU_HOURS")).thenReturn(Optional.of(createTestPrice("CPU_HOURS", 0.05)));
        when(priceRepository.findById("MEMORY_GB_HOURS")).thenReturn(Optional.of(createTestPrice("MEMORY_GB_HOURS", 0.03)));
        when(priceRepository.findById("STORAGE_GB")).thenReturn(Optional.of(createTestPrice("STORAGE_GB", 0.01)));
        when(invoiceRepository.save(any(Invoice.class))).thenReturn(createTestInvoice());

        billingService.CreateMonthlyBills();

        // Should save one invoice successfully and continue after failure
        verify(invoiceRepository, times(1)).save(any(Invoice.class));
    }

    @Test
    void testVerifyMonthlyBillsCreated_NoMissingInvoices() {
        List<String> projectIds = Arrays.asList(TEST_PROJECT_ID);
        Invoice existingInvoice = createTestInvoice();

        when(apiService.getListOfProjectIds()).thenReturn(projectIds);
        when(invoiceRepository.findByProjectIdAndEndDateBetween(
                eq(TEST_PROJECT_ID), any(Date.class), any(Date.class)))
                .thenReturn(Arrays.asList(existingInvoice));

        billingService.verifyMonthlyBillsCreated();

        // Should not create any new invoices
        verify(invoiceRepository, never()).save(any(Invoice.class));
    }

    @Test
    void testVerifyMonthlyBillsCreated_CreatesMissingInvoices() {
        List<String> projectIds = Arrays.asList(TEST_PROJECT_ID);
        UsageMonth usageMonth = new UsageMonth();
        usageMonth.setCpuRequestCores(10.0);
        usageMonth.setMemoryUsageGB(20.0);

        when(apiService.getListOfProjectIds()).thenReturn(projectIds);
        when(invoiceRepository.findByProjectIdAndEndDateBetween(
                eq(TEST_PROJECT_ID), any(Date.class), any(Date.class)))
                .thenReturn(new ArrayList<>());
        when(apiService.usageRecordForLastMonth(eq(TEST_PROJECT_ID), anyInt())).thenReturn(usageMonth);
        when(priceRepository.findById("CPU_HOURS")).thenReturn(Optional.of(createTestPrice("CPU_HOURS", 0.05)));
        when(priceRepository.findById("MEMORY_GB_HOURS")).thenReturn(Optional.of(createTestPrice("MEMORY_GB_HOURS", 0.03)));
        when(priceRepository.findById("STORAGE_GB")).thenReturn(Optional.of(createTestPrice("STORAGE_GB", 0.01)));
        when(invoiceRepository.save(any(Invoice.class))).thenReturn(createTestInvoice());

        billingService.verifyMonthlyBillsCreated();

        verify(invoiceRepository, times(1)).save(any(Invoice.class));
    }

    @Test
    void testMarkOverdueInvoices_Success() {
        Invoice oldOpenInvoice = createTestInvoice();
        oldOpenInvoice.setEndDate(Date.valueOf(LocalDate.now().minusDays(10)));

        Invoice recentOpenInvoice = createTestInvoice();
        recentOpenInvoice.setInvoiceId("recent-invoice");
        recentOpenInvoice.setEndDate(Date.valueOf(LocalDate.now().minusDays(3)));

        when(invoiceRepository.findByStatus(InvoiceStatus.OPEN))
                .thenReturn(Arrays.asList(oldOpenInvoice, recentOpenInvoice));
        when(invoiceRepository.save(any(Invoice.class))).thenReturn(oldOpenInvoice);

        billingService.markOverdueInvoices();

        // Only the old invoice should be marked as overdue
        verify(invoiceRepository, times(1)).save(argThat(invoice ->
                invoice.getStatus() == InvoiceStatus.OVERDUE
        ));
    }

    @Test
    void testMarkOverdueInvoices_NoOverdueInvoices() {
        Invoice recentInvoice = createTestInvoice();
        recentInvoice.setEndDate(Date.valueOf(LocalDate.now().minusDays(2)));

        when(invoiceRepository.findByStatus(InvoiceStatus.OPEN))
                .thenReturn(Arrays.asList(recentInvoice));

        billingService.markOverdueInvoices();

        verify(invoiceRepository, never()).save(any(Invoice.class));
    }

    @Test
    void testMarkOverdueInvoices_NullEndDate() {
        Invoice invoiceWithNullDate = createTestInvoice();
        invoiceWithNullDate.setEndDate(null);

        when(invoiceRepository.findByStatus(InvoiceStatus.OPEN))
                .thenReturn(Arrays.asList(invoiceWithNullDate));

        billingService.markOverdueInvoices();

        verify(invoiceRepository, never()).save(any(Invoice.class));
    }

    @Test
    void testGenerateFinalInvoice_Success() {
        String projectId = TEST_PROJECT_ID;
        String username = TEST_USER_ID;

        // Mock usage data
        UsageMonth usage = new UsageMonth();
        usage.setCpuRequestCores(10);
        usage.setMemoryUsageGB(20);
        when(apiService.usageRecordForLastMonth(eq(projectId), anyInt())).thenReturn(usage);

        // Mock prices (even though totals come from saved invoice, method still calls getPrice)
        Price cpuPrice = new Price(); cpuPrice.setPrice(2.0); cpuPrice.setMetric("CPU_HOURS");
        Price memoryPrice = new Price(); memoryPrice.setPrice(3.0); memoryPrice.setMetric("MEMORY_GB_HOURS");
        Price storagePrice = new Price(); storagePrice.setPrice(1.0); storagePrice.setMetric("STORAGE_GB");

        // Spy on getPrice() method to return mocked prices
        BillingServiceImpl spyService = spy(billingService);
        doReturn(cpuPrice).when(spyService).getPrice("CPU_HOURS");
        doReturn(memoryPrice).when(spyService).getPrice("MEMORY_GB_HOURS");
        doReturn(storagePrice).when(spyService).getPrice("STORAGE_GB");

        // Return our predefined invoice when repository saves
        Invoice savedInvoice = createTestInvoice();
        when(invoiceRepository.save(any(Invoice.class))).thenReturn(savedInvoice);

        // Call method
        Invoice finalInvoice = spyService.generateFinalInvoice(projectId, username, AUTH_HEADER);

        // Assertions against the test invoice
        assertNotNull(finalInvoice);
        assertEquals(savedInvoice.getInvoiceId(), finalInvoice.getInvoiceId());
        assertEquals(savedInvoice.getStatus(), finalInvoice.getStatus());
        assertEquals(0, finalInvoice.getTotalCPU().compareTo(savedInvoice.getTotalCPU()));
        assertEquals(0, finalInvoice.getTotalRAM().compareTo(savedInvoice.getTotalRAM()));
        assertEquals(0, finalInvoice.getTotalSTORAGE().compareTo(savedInvoice.getTotalSTORAGE()));
        assertEquals(0, finalInvoice.getSubtotal().compareTo(savedInvoice.getSubtotal()));
        assertEquals(0, finalInvoice.getTaxes().compareTo(savedInvoice.getTaxes()));
        assertEquals(0, finalInvoice.getTotal().compareTo(savedInvoice.getTotal()));

        // Verify repository save was called
        verify(invoiceRepository).save(any(Invoice.class));
    }


    @Test
    void testGenerateFinalInvoice_MissingPrice_ThrowsEntityNotFound() {
        String projectId = "proj-123";
        String username = "user-abc";

        // Mock usage
        UsageMonth usage = new UsageMonth();
        usage.setCpuRequestCores(10);
        usage.setMemoryUsageGB(20);
        when(apiService.usageRecordForLastMonth(eq(projectId), anyInt())).thenReturn(usage);

        // Spy on getPrice() to return null for CPU
        BillingServiceImpl spyService = spy(billingService);
        doReturn(null).when(spyService).getPrice("CPU_HOURS");
        doReturn(new Price()).when(spyService).getPrice("MEMORY_GB_HOURS");
        doReturn(new Price()).when(spyService).getPrice("STORAGE_GB");

        EntityNotFoundException exception = assertThrows(EntityNotFoundException.class,
                () -> spyService.generateFinalInvoice(projectId, username, AUTH_HEADER));

        assertEquals("One or more price records not found", exception.getMessage());
        verify(invoiceRepository, never()).save(any());
    }
}
