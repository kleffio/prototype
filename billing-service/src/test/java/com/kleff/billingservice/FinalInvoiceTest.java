package com.kleff.billingservice;

import com.kleff.billingservice.buisnesslayer.ApiService;
import com.kleff.billingservice.buisnesslayer.BillingService;
import com.kleff.billingservice.buisnesslayer.BillingServiceImpl;
import com.kleff.billingservice.datalayer.Allocation.ReservedAllocation;
import com.kleff.billingservice.datalayer.Allocation.ReservedAllocationRepository;
import com.kleff.billingservice.datalayer.Invoice.Invoice;
import com.kleff.billingservice.datalayer.Invoice.InvoiceRepository;
import com.kleff.billingservice.datalayer.Invoice.InvoiceStatus;
import com.kleff.billingservice.datalayer.Pricing.Price;
import com.kleff.billingservice.datalayer.Pricing.PriceRepository;
import com.kleff.billingservice.datalayer.Record.PricingModel;
import com.kleff.billingservice.datalayer.Record.UsageRecord;
import com.kleff.billingservice.datalayer.Record.UsageRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest
public class FinalInvoiceTest {

    @Mock
    private ApiService apiService;

    @Mock
    private ReservedAllocationRepository reservedAllocationRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private UsageRecordRepository usageRecordRepository;

    @Mock
    private PriceRepository priceRepository;

    @InjectMocks
    private BillingServiceImpl billingService;

    private String testProjectId = "test-project-123";
    private String testUsername = "test-owner";

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testGenerateFinalInvoice_NoUsageRecords() {
        // Given
        when(usageRecordRepository.findByProjectIdIs(testProjectId)).thenReturn(Collections.emptyList());
        when(reservedAllocationRepository.findByProjectId(testProjectId)).thenReturn(Collections.emptyList());
        
        Price cpuPrice = new Price();
        cpuPrice.setMetric("CPU_HOURS");
        cpuPrice.setPrice(0.1);
        
        Price memoryPrice = new Price();
        memoryPrice.setMetric("MEMORY_GB_HOURS");
        memoryPrice.setPrice(0.05);
        
        Price storagePrice = new Price();
        storagePrice.setMetric("STORAGE_GB");
        storagePrice.setPrice(0.01);
        
        when(priceRepository.findById("CPU_HOURS")).thenReturn(cpuPrice);
        when(priceRepository.findById("MEMORY_GB_HOURS")).thenReturn(memoryPrice);
        when(priceRepository.findById("STORAGE_GB")).thenReturn(storagePrice);

        // When
        Invoice result = billingService.generateFinalInvoice(testProjectId, testUsername);

        // Then
        assertNotNull(result);
        assertEquals(testProjectId, result.getProjectId());
        assertEquals(InvoiceStatus.UNPAID, result.getStatus());
        assertEquals(BigDecimal.ZERO, result.getTotalCPU());
        assertEquals(BigDecimal.ZERO, result.getTotalRAM());
        assertEquals(BigDecimal.ZERO, result.getTotalSTORAGE());
        assertEquals(BigDecimal.ZERO, result.getSubtotal());
        assertEquals(BigDecimal.ZERO, result.getTaxes());
        assertEquals(BigDecimal.ZERO, result.getTotal());
        assertEquals(BigDecimal.ZERO, result.getTotalPaid());
        
        verify(invoiceRepository).save(any(Invoice.class));
    }

    @Test
    void testGenerateFinalInvoice_WithUsageRecords() {
        // Given
        UsageRecord record1 = new UsageRecord();
        record1.setProjectId(testProjectId);
        record1.setPricingModel(PricingModel.ON_DEMAND);
        record1.setCPU_HOURS(10.0);
        record1.setMEMORY_GB_HOURS(5.0);
        record1.setSTORAGE_GB(2.0);
        record1.setRecordedAt(LocalDateTime.now());

        UsageRecord record2 = new UsageRecord();
        record2.setProjectId(testProjectId);
        record2.setPricingModel(PricingModel.ON_DEMAND);
        record2.setCPU_HOURS(5.0);
        record2.setMEMORY_GB_HOURS(3.0);
        record2.setSTORAGE_GB(1.0);
        record2.setRecordedAt(LocalDateTime.now());

        List<UsageRecord> usageRecords = Arrays.asList(record1, record2);
        when(usageRecordRepository.findByProjectIdIs(testProjectId)).thenReturn(usageRecords);
        when(reservedAllocationRepository.findByProjectId(testProjectId)).thenReturn(Collections.emptyList());
        
        Price cpuPrice = new Price();
        cpuPrice.setMetric("CPU_HOURS");
        cpuPrice.setPrice(0.1);
        
        Price memoryPrice = new Price();
        memoryPrice.setMetric("MEMORY_GB_HOURS");
        memoryPrice.setPrice(0.05);
        
        Price storagePrice = new Price();
        storagePrice.setMetric("STORAGE_GB");
        storagePrice.setPrice(0.01);
        
        when(priceRepository.findById("CPU_HOURS")).thenReturn(cpuPrice);
        when(priceRepository.findById("MEMORY_GB_HOURS")).thenReturn(memoryPrice);
        when(priceRepository.findById("STORAGE_GB")).thenReturn(storagePrice);

        // When
        Invoice result = billingService.generateFinalInvoice(testProjectId, testUsername);

        // Then
        assertNotNull(result);
        assertEquals(testProjectId, result.getProjectId());
        assertEquals(InvoiceStatus.UNPAID, result.getStatus());
        
        // CPU: (10 + 5) * 0.1 = 1.5
        assertEquals(new BigDecimal("1.50"), result.getTotalCPU());
        
        // RAM: (5 + 3) * 0.05 = 0.4
        assertEquals(new BigDecimal("0.40"), result.getTotalRAM());
        
        // Storage: (2 + 1) * 0.01 = 0.03
        assertEquals(new BigDecimal("0.03"), result.getTotalSTORAGE());
        
        // Subtotal: 1.5 + 0.4 + 0.03 = 1.93
        assertEquals(new BigDecimal("1.93"), result.getSubtotal());
        
        // Taxes: 1.93 * 0.114975 = 0.22190175 -> rounded to 0.22
        assertEquals(new BigDecimal("0.22"), result.getTaxes());
        
        // Total: 1.93 + 0.22 = 2.15
        assertEquals(new BigDecimal("2.15"), result.getTotal());
        
        verify(invoiceRepository).save(any(Invoice.class));
    }

    @Test
    void testGenerateFinalInvoice_WithReservedAllocations() {
        // Given
        when(usageRecordRepository.findByProjectIdIs(testProjectId)).thenReturn(Collections.emptyList());
        
        ReservedAllocation allocation1 = new ReservedAllocation();
        allocation1.setProjectId(testProjectId);
        allocation1.setCpuHours(20.0);
        allocation1.setMemoryGbHours(10.0);
        allocation1.setStorageGb(5.0);

        ReservedAllocation allocation2 = new ReservedAllocation();
        allocation2.setProjectId(testProjectId);
        allocation2.setCpuHours(10.0);
        allocation2.setMemoryGbHours(5.0);
        allocation2.setStorageGb(2.0);

        List<ReservedAllocation> allocations = Arrays.asList(allocation1, allocation2);
        when(reservedAllocationRepository.findByProjectId(testProjectId)).thenReturn(allocations);
        
        Price cpuPrice = new Price();
        cpuPrice.setMetric("CPU_HOURS");
        cpuPrice.setPrice(0.1);
        
        Price memoryPrice = new Price();
        memoryPrice.setMetric("MEMORY_GB_HOURS");
        memoryPrice.setPrice(0.05);
        
        Price storagePrice = new Price();
        storagePrice.setMetric("STORAGE_GB");
        storagePrice.setPrice(0.01);
        
        when(priceRepository.findById("CPU_HOURS")).thenReturn(cpuPrice);
        when(priceRepository.findById("MEMORY_GB_HOURS")).thenReturn(memoryPrice);
        when(priceRepository.findById("STORAGE_GB")).thenReturn(storagePrice);

        // When
        Invoice result = billingService.generateFinalInvoice(testProjectId, testUsername);

        // Then
        assertNotNull(result);
        assertEquals(testProjectId, result.getProjectId());
        
        // CPU: (20 + 10) * 0.1 = 3.0
        assertEquals(new BigDecimal("3.00"), result.getTotalCPU());
        
        // RAM: (10 + 5) * 0.05 = 0.75
        assertEquals(new BigDecimal("0.75"), result.getTotalRAM());
        
        // Storage: (5 + 2) * 0.01 = 0.07
        assertEquals(new BigDecimal("0.07"), result.getTotalSTORAGE());
        
        // Subtotal: 3.0 + 0.75 + 0.07 = 3.82
        assertEquals(new BigDecimal("3.82"), result.getSubtotal());
        
        // Taxes: 3.82 * 0.114975 = 0.4392045 -> rounded to 0.44
        assertEquals(new BigDecimal("0.44"), result.getTaxes());
        
        // Total: 3.82 + 0.44 = 4.26
        assertEquals(new BigDecimal("4.26"), result.getTotal());
        
        verify(invoiceRepository).save(any(Invoice.class));
    }

    @Test
    void testGenerateFinalInvoice_MissingPriceRecords() {
        // Given
        when(usageRecordRepository.findByProjectIdIs(testProjectId)).thenReturn(Collections.emptyList());
        when(reservedAllocationRepository.findByProjectId(testProjectId)).thenReturn(Collections.emptyList());
        
        // Return null for one of the prices
        when(priceRepository.findById("CPU_HOURS")).thenReturn(null);
        when(priceRepository.findById("MEMORY_GB_HOURS")).thenReturn(new Price());
        when(priceRepository.findById("STORAGE_GB")).thenReturn(new Price());

        // When & Then
        assertThrows(Exception.class, () -> {
            billingService.generateFinalInvoice(testProjectId, testUsername);
        });
        
        verify(invoiceRepository, never()).save(any(Invoice.class));
    }

    @Test
    void testGenerateFinalInvoice_MixedUsageAndReserved() {
        // Given
        UsageRecord onDemandRecord = new UsageRecord();
        onDemandRecord.setProjectId(testProjectId);
        onDemandRecord.setPricingModel(PricingModel.ON_DEMAND);
        onDemandRecord.setCPU_HOURS(5.0);
        onDemandRecord.setMEMORY_GB_HOURS(2.0);
        onDemandRecord.setSTORAGE_GB(1.0);

        ReservedAllocation reservedAllocation = new ReservedAllocation();
        reservedAllocation.setProjectId(testProjectId);
        reservedAllocation.setCpuHours(10.0);
        reservedAllocation.setMemoryGbHours(5.0);
        reservedAllocation.setStorageGb(2.0);

        when(usageRecordRepository.findByProjectIdIs(testProjectId)).thenReturn(Arrays.asList(onDemandRecord));
        when(reservedAllocationRepository.findByProjectId(testProjectId)).thenReturn(Arrays.asList(reservedAllocation));
        
        Price cpuPrice = new Price();
        cpuPrice.setMetric("CPU_HOURS");
        cpuPrice.setPrice(0.1);
        
        Price memoryPrice = new Price();
        memoryPrice.setMetric("MEMORY_GB_HOURS");
        memoryPrice.setPrice(0.05);
        
        Price storagePrice = new Price();
        storagePrice.setMetric("STORAGE_GB");
        storagePrice.setPrice(0.01);
        
        when(priceRepository.findById("CPU_HOURS")).thenReturn(cpuPrice);
        when(priceRepository.findById("MEMORY_GB_HOURS")).thenReturn(memoryPrice);
        when(priceRepository.findById("STORAGE_GB")).thenReturn(storagePrice);

        // When
        Invoice result = billingService.generateFinalInvoice(testProjectId, testUsername);

        // Then
        assertNotNull(result);
        assertEquals(testProjectId, result.getProjectId());
        
        // CPU: (5 * 0.1) + (10 * 0.1) = 0.5 + 1.0 = 1.5
        assertEquals(new BigDecimal("1.50"), result.getTotalCPU());
        
        // RAM: (2 * 0.05) + (5 * 0.05) = 0.1 + 0.25 = 0.35
        assertEquals(new BigDecimal("0.35"), result.getTotalRAM());
        
        // Storage: (1 * 0.01) + (2 * 0.01) = 0.01 + 0.02 = 0.03
        assertEquals(new BigDecimal("0.03"), result.getTotalSTORAGE());
        
        // Subtotal: 1.5 + 0.35 + 0.03 = 1.88
        assertEquals(new BigDecimal("1.88"), result.getSubtotal());
        
        // Taxes: 1.88 * 0.114975 = 0.216153 -> rounded to 0.22
        assertEquals(new BigDecimal("0.22"), result.getTaxes());
        
        // Total: 1.88 + 0.22 = 2.10
        assertEquals(new BigDecimal("2.10"), result.getTotal());
        
        verify(invoiceRepository).save(any(Invoice.class));
    }
}