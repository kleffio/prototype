package com.kleff.billingservice.buisnesslayer;

import com.kleff.billingservice.datalayer.Allocation.ReservedAllocation;
import com.kleff.billingservice.datalayer.Allocation.ReservedAllocationRepository;
import com.kleff.billingservice.datalayer.Invoice.Invoice;
import com.kleff.billingservice.datalayer.Invoice.InvoiceRepository;
import com.kleff.billingservice.datalayer.Invoice.InvoiceStatus;
import com.kleff.billingservice.datalayer.Pricing.Price;
import com.kleff.billingservice.datalayer.Pricing.PriceRepository;
import com.kleff.billingservice.datalayer.Record.*;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
@Slf4j
@Service
public class BillingServiceImpl implements BillingService {

    //Initialisation
    private ApiService apiService;
    private ReservedAllocationRepository reservedAllocationRepository;
    private InvoiceRepository invoiceRepository;
    private UsageRecordRepository usageRecordRepository;
    private PriceRepository priceRepository;
    private double taxes = 0.114975;

    public BillingServiceImpl(
            ReservedAllocationRepository reservedAllocationRepository,
            InvoiceRepository invoiceRepository,
            UsageRecordRepository usageRecordRepository,
            PriceRepository priceRepository,
            ApiService apiService
    ) {
        this.reservedAllocationRepository = reservedAllocationRepository;
        this.invoiceRepository = invoiceRepository;
        this.usageRecordRepository = usageRecordRepository;
        this.priceRepository = priceRepository;
        this.apiService = apiService;
    }

    //All the invoice logic


    @Override
    public Invoice createInvoice(Invoice invoice) {
        invoice.setTotalPaid(BigDecimal.valueOf(0));
        return invoiceRepository.save(invoice);
    }



    //Usage record logic

    @Override
    public void createUsageRecord(UsageRecord records) {
        usageRecordRepository.save(records);
    }

    @Override
    public List<UsageRecord> getUsageRecordsForProject(String projectId) {
        return usageRecordRepository.findByProjectIdIs(projectId);
    }

    @Override
    public void payInvoice(String invoiceId) {
        try {
            Invoice bill = invoiceRepository.findByInvoiceId(invoiceId);
            bill.setStatus(InvoiceStatus.PAID);
            invoiceRepository.save(bill);
        } catch (Exception e) {
            throw new RuntimeException("Payment registry failed");
        }
    }


    @Override
    public void createReservedAllocation(ReservedAllocation reservedAllocation) {
        reservedAllocationRepository.save(reservedAllocation);
    }

    @Override
    public List<Invoice> getInvoicesForAProject(String projectId) {
        return invoiceRepository.findByProjectId(projectId);
    }
    
    @Override
    public Invoice getInvoiceById(String invoiceId) {
        return invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new EntityNotFoundException("Invoice not found: " + invoiceId));
    }


    // Validation for payment
    public long computeOutstandingCents(String invoiceId) {

        // 1. Find the invoice
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Invoice not found: " + invoiceId));


//        if (!project.getOwnerUsername().equals(username)) {
//            throw new UnauthorizedException("You don't have permission to pay this invoice");
//        }

        // 3. Verify invoice is payable
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new IllegalArgumentException("Invoice is already paid");
        }

        if (invoice.getStatus() == InvoiceStatus.VOID) {
            throw new IllegalArgumentException("Invoice is cancelled");
        }

        // 4. Calculate outstanding amount (in cents for Stripe)
        long totalCents = invoice.getTotal().multiply(BigDecimal.valueOf(100)).longValue();
        long paidCents;
        if (invoice.getTotalPaid() == null){
            paidCents = 0;
        }
        else {
            paidCents = invoice.getTotalPaid().multiply(BigDecimal.valueOf(100)).longValue();
        }
        long outstandingCents = totalCents - paidCents;
            if (outstandingCents <= 0) {
                throw new IllegalArgumentException("No outstanding balance on this invoice");
            }

            // 5. Optional: Check for minimum amount
            if (outstandingCents < 50) { // Stripe minimum is $0.50
                throw new IllegalArgumentException("Amount too small for payment processing");
            }

        return outstandingCents;
    }


    //Bellow is where the price endpoints will be

    public Price getPrice(String itemId) {
        return priceRepository.findById(itemId).orElse(null);
    }

    public List<Price> getPrices() {

        return priceRepository.findAll();
    }

    // THIS ENDPOINT SHOULD ALWAYS BE RESTRICTED
    public void setPrice(Price price) {
        Price price1 = priceRepository.findByMetric(price.getMetric());
        price1.setPrice(price.getPrice());
        priceRepository.save(price1);
    }


    public Invoice getLastsMonthUsageRecordsAverage(String projectId, int days) {
        UsageMonth usage = apiService.usageRecordForLastMonth(projectId, days);

        Invoice invoice = new Invoice();
        BigDecimal CPU = BigDecimal.valueOf(usage.getCpuRequestCores());
        BigDecimal MEMORY = BigDecimal.valueOf(usage.getMemoryUsageGB());
        BigDecimal STORAGE = BigDecimal.valueOf(0);
        invoice.setTotalPaid(BigDecimal.valueOf(0));
        
        // Fetch prices with null safety checks
        Price cpuPrice = getPrice("CPU_HOURS");
        Price memoryPrice = getPrice("MEMORY_GB_HOURS");
        Price storagePrice = getPrice("STORAGE_GB");
        
        if (cpuPrice == null || memoryPrice == null || storagePrice == null) {
            throw new EntityNotFoundException("One or more price records not found");
        }
        
        BigDecimal cpuPriceValue = BigDecimal.valueOf(cpuPrice.getPrice());
        BigDecimal memoryPriceValue = BigDecimal.valueOf(memoryPrice.getPrice());
        BigDecimal storagePriceValue = BigDecimal.valueOf(storagePrice.getPrice());
        
        invoice.setTotalCPU(CPU.multiply(cpuPriceValue));
        invoice.setTotalRAM(MEMORY.multiply(memoryPriceValue));
        invoice.setTotalSTORAGE(STORAGE.multiply(storagePriceValue));
        
        BigDecimal subtotal = invoice.getTotalCPU().add(invoice.getTotalRAM()).add(invoice.getTotalSTORAGE());
        invoice.setSubtotal(subtotal);
        
        BigDecimal taxAmount = subtotal.multiply(BigDecimal.valueOf(taxes));
        invoice.setTaxes(taxAmount);
        
        BigDecimal total = subtotal.add(taxAmount).setScale(2, BigDecimal.ROUND_HALF_UP);
        invoice.setTotal(total);
        return invoice;
    }




    @Scheduled(cron = "0 0 3 1 * ?")
    @Transactional
    public void CreateMonthlyBills(){
        YearMonth previousMonth = YearMonth.now().minusMonths(1);
        int daysInPreviousMonth = previousMonth.lengthOfMonth();
        List<String> listOfProjectIds = apiService.getListOfProjectIds();

        for(String projectId : listOfProjectIds){
            try {
                invoiceRepository.save(getLastsMonthUsageRecordsAverage(projectId, daysInPreviousMonth));
            } catch (Exception e) {
                log.info("Failed to create invoice for project: " + projectId, e);
                // Continue with other projects
            }
        }
    }

    /**
     * Generates a final invoice for a project being deleted.
     * This invoice includes all outstanding usage charges up to the deletion time.
     * 
     * @param projectId The ID of the project being deleted
     * @param username The username of the project owner (for authorization)
     * @return The generated final invoice
     * @throws EntityNotFoundException if project or pricing data is not found
     * @throws IllegalArgumentException if user is not authorized or project has issues
     */
    @Override
    @Transactional
    public Invoice generateFinalInvoice(String projectId, String username) {
        log.info("Generating final invoice for project: {} for user: {}", projectId, username);
        
        // 1. Verify project exists and user is owner (this will be validated by the caller)
        // For now, we'll rely on the controller to handle authorization
        
        // 2. Get all outstanding usage records for the project
        List<UsageRecord> usageRecords = usageRecordRepository.findByProjectIdIs(projectId);
        
        if (usageRecords.isEmpty()) {
            log.info("No usage records found for project: {}", projectId);
        }
        
        // 3. Calculate totals by pricing model
        BigDecimal totalCPU = BigDecimal.ZERO;
        BigDecimal totalRAM = BigDecimal.ZERO;
        BigDecimal totalSTORAGE = BigDecimal.ZERO;
        
        // Fetch prices with null safety checks
        Price cpuPrice = getPrice("CPU_HOURS");
        Price memoryPrice = getPrice("MEMORY_GB_HOURS");
        Price storagePrice = getPrice("STORAGE_GB");
        
        if (cpuPrice == null || memoryPrice == null || storagePrice == null) {
            throw new EntityNotFoundException("One or more price records not found");
        }
        
        BigDecimal cpuPriceValue = BigDecimal.valueOf(cpuPrice.getPrice());
        BigDecimal memoryPriceValue = BigDecimal.valueOf(memoryPrice.getPrice());
        BigDecimal storagePriceValue = BigDecimal.valueOf(storagePrice.getPrice());
        
        // Calculate charges for ON_DEMAND usage records
        for (UsageRecord record : usageRecords) {
            if (record.getPricingModel() == PricingModel.ON_DEMAND) {
                if (record.getCPU_HOURS() != null) {
                    totalCPU = totalCPU.add(BigDecimal.valueOf(record.getCPU_HOURS()).multiply(cpuPriceValue));
                }
                if (record.getMEMORY_GB_HOURS() != null) {
                    totalRAM = totalRAM.add(BigDecimal.valueOf(record.getMEMORY_GB_HOURS()).multiply(memoryPriceValue));
                }
                if (record.getSTORAGE_GB() != null) {
                    totalSTORAGE = totalSTORAGE.add(BigDecimal.valueOf(record.getSTORAGE_GB()).multiply(storagePriceValue));
                }
            }
        }
        
        // 4. Handle reserved allocations if they exist
        List<ReservedAllocation> reservedAllocations = reservedAllocationRepository.findByProjectId(projectId);
        for (ReservedAllocation allocation : reservedAllocations) {
            // For reserved allocations, we might want to charge differently
            // For now, we'll include them in the final invoice at regular rates
            // This could be modified based on business requirements
            if (allocation.getCpuHours() != null) {
                totalCPU = totalCPU.add(BigDecimal.valueOf(allocation.getCpuHours()).multiply(cpuPriceValue));
            }
            if (allocation.getMemoryGbHours() != null) {
                totalRAM = totalRAM.add(BigDecimal.valueOf(allocation.getMemoryGbHours()).multiply(memoryPriceValue));
            }
            if (allocation.getStorageGb() != null) {
                totalSTORAGE = totalSTORAGE.add(BigDecimal.valueOf(allocation.getStorageGb()).multiply(storagePriceValue));
            }
        }
        
        // 5. Calculate totals
        BigDecimal subtotal = totalCPU.add(totalRAM).add(totalSTORAGE);
        BigDecimal taxAmount = subtotal.multiply(BigDecimal.valueOf(taxes));
        BigDecimal total = subtotal.add(taxAmount).setScale(2, BigDecimal.ROUND_HALF_UP);
        
        // 6. Create final invoice
        Invoice finalInvoice = Invoice.builder()
            .projectId(projectId)
            .startDate(new java.sql.Date(System.currentTimeMillis()))
            .endDate(new java.sql.Date(System.currentTimeMillis()))
            .status(InvoiceStatus.UNPAID)
            .totalCPU(totalCPU)
            .totalRAM(totalRAM)
            .totalSTORAGE(totalSTORAGE)
            .subtotal(subtotal)
            .taxes(taxAmount)
            .total(total)
            .totalPaid(BigDecimal.ZERO)
            .build();
        
        // 7. Save the invoice
        Invoice savedInvoice = invoiceRepository.save(finalInvoice);
        
        log.info("Final invoice generated for project {}: Invoice ID: {}, Total: ${}", 
                projectId, savedInvoice.getInvoiceId(), savedInvoice.getTotal());
        
        return savedInvoice;
    }
}




