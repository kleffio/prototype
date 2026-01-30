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
import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Collectors;

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


    public void markInvoiceAsPaid(String invoiceId, String stripeSessionId) {
        Invoice invoice = getInvoiceById(invoiceId);

        // Only update if not already paid
        if (invoice.getStatus() != InvoiceStatus.PAID) {
            invoice.setStatus(InvoiceStatus.PAID);
            invoice.setPaymentDate(Date.valueOf(LocalDate.now()));
            invoiceRepository.save(invoice);
            log.info("Invoice {} marked as paid", invoiceId);
        } else {
            log.info("Invoice {} already paid, skipping update", invoiceId);
        }
    }


    //Bellow is where the price endpoints will be

    public Price getPrice(String itemId) {
        return priceRepository.findById(itemId).orElse(null);
    }

    public List<Price> getPrices() {

        return priceRepository.findAll();
    }
    // For notifications, we return unpaid invoice and overdue invoices
    @Override
    public List<Invoice> getNotificationsForProject(String projectId) {
        List<Invoice> invoices = invoiceRepository.findByProjectId(projectId);
        // Filter invoices with OPEN status
        List<Invoice> notifications = invoices.stream()
                .filter(invoice -> invoice.getStatus() == InvoiceStatus.OPEN)
                .collect(Collectors.toList());

        return notifications;
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
}




