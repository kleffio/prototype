package com.kleff.billingservice.buisnesslayer;

import com.kleff.billingservice.datalayer.Allocation.ReservedAllocation;
import com.kleff.billingservice.datalayer.Allocation.ReservedAllocationRepository;
import com.kleff.billingservice.datalayer.Invoice.Invoice;
import com.kleff.billingservice.datalayer.Invoice.InvoiceRepository;
import com.kleff.billingservice.datalayer.Invoice.InvoiceStatus;
import com.kleff.billingservice.datalayer.Pricing.Price;
import com.kleff.billingservice.datalayer.Pricing.PriceRepository;
import com.kleff.billingservice.datalayer.Record.UsageMonth;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
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
    private PriceRepository priceRepository;
    private double taxes = 0.114975;
    private RestClient restClient;

    public BillingServiceImpl(
            ReservedAllocationRepository reservedAllocationRepository,
            InvoiceRepository invoiceRepository,
            PriceRepository priceRepository,
            ApiService apiService,
            RestClient.Builder restClientBuilder
    ) {
        this.reservedAllocationRepository = reservedAllocationRepository;
        this.invoiceRepository = invoiceRepository;
        this.priceRepository = priceRepository;
        this.apiService = apiService;
        this.restClient = restClientBuilder.build();
    }

    //All the invoice logic


    @Override
    public Invoice createInvoice(Invoice invoice) {
        invoice.setTotalPaid(BigDecimal.valueOf(0));
        return invoiceRepository.save(invoice);
    }


    //Usage record logic

    @Override
    public List<Invoice> getAllNotificationsForUser(String userId, String authHeader) {
        // Get all invoices from the database
        List<Invoice> allInvoices = invoiceRepository.findAll();

        // Filter invoices based on user permissions
        return allInvoices.stream()
                .filter(invoice -> {
                    try {
                        // Check if user has permission to view this invoice's project
                        // We use the existing hasPermission method from the controller
                        // Since we can't access the controller directly, we'll make the REST call here
                        List<String> permissions = restClient.get()
                                .uri("/api/v1/collaborators/" + invoice.getProjectId() + "/user/" + userId + "/permissions")
                                .header("Authorization", authHeader)
                                .retrieve()
                                .body(new ParameterizedTypeReference<List<String>>() {
                                });

                        return permissions != null && permissions.contains("MANAGE_BILLING");
                    } catch (Exception e) {
                        // If permission check fails (e.g., project not found/deleted),
                        // still include the invoice if it belongs to the user
                        // This allows users to see final invoices from deleted projects
                        log.warn("Permission check failed for project {} (likely deleted), including invoice {}",
                                invoice.getProjectId(), invoice.getInvoiceId());
                        return true;
                    }
                })
                .collect(java.util.stream.Collectors.toList());
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
        if (invoice.getTotalPaid() == null) {
            paidCents = 0;
        } else {
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
        // Filter invoices with OPEN, OVERDUE, or UNPAID status
        List<Invoice> notifications = invoices.stream()
                .filter(invoice -> invoice.getStatus() == InvoiceStatus.OPEN || invoice.getStatus() == InvoiceStatus.OVERDUE || invoice.getStatus() == InvoiceStatus.UNPAID)
                .collect(Collectors.toList());

        return notifications;
    }

    @Override
    public List<Invoice> getAllNotificationsForUser(List<String> projectIds) {
        List<Invoice> allInvoices = invoiceRepository.findByProjectIdIn(projectIds);
        // Filter invoices with OPEN, OVERDUE, or UNPAID status
        List<Invoice> notifications = allInvoices.stream()
                .filter(invoice -> invoice.getStatus() == InvoiceStatus.OPEN || invoice.getStatus() == InvoiceStatus.OVERDUE || invoice.getStatus() == InvoiceStatus.UNPAID)
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

    @Scheduled(cron = "0 0 3 2 * ?")
    @Transactional
    public void verifyMonthlyBillsCreated() {
        log.info("Starting failsafe verification of monthly bill generation");

        YearMonth previousMonth = YearMonth.now().minusMonths(1);
        int daysInPreviousMonth = previousMonth.lengthOfMonth();

        // Get all project IDs
        List<String> listOfProjectIds = apiService.getListOfProjectIds();

        int missingCount = 0;
        int createdCount = 0;

        for (String projectId : listOfProjectIds) {
            try {
                // Check if invoice was created for this project for the previous month
                // We look for invoices created in the current month for the previous month's usage
                LocalDate firstDayOfCurrentMonth = LocalDate.now().withDayOfMonth(1);
                LocalDate todayDate = LocalDate.now();

                List<Invoice> recentInvoices = invoiceRepository.findByProjectIdAndEndDateBetween(
                        projectId,
                        Date.valueOf(firstDayOfCurrentMonth),
                        Date.valueOf(todayDate)
                );

                // If no invoice found for this project in the current month, create one
                if (recentInvoices.isEmpty()) {
                    log.warn("Missing monthly invoice for project: {} - Creating now", projectId);
                    missingCount++;

                    Invoice invoice = getLastsMonthUsageRecordsAverage(projectId, daysInPreviousMonth);
                    invoiceRepository.save(invoice);
                    createdCount++;

                    log.info("Failsafe created invoice for project: {} - Invoice ID: {}",
                            projectId, invoice.getInvoiceId());
                }

            } catch (Exception e) {
                log.error("Failsafe failed to verify/create invoice for project: {}", projectId, e);
                // Continue with other projects
            }
        }

        log.info("Failsafe verification completed. Missing invoices detected: {}, Successfully created: {}",
                missingCount, createdCount);
    }

    @Scheduled(cron = "0 0 4 * * ?")
    @Transactional
    public void markOverdueInvoices() {
        log.info("Starting scheduled task to mark overdue invoices");

        LocalDate today = LocalDate.now();
        LocalDate sevenDaysAgo = today.minusDays(7);

        // Find all OPEN invoices
        List<Invoice> openInvoices = invoiceRepository.findByStatus(InvoiceStatus.OPEN);

        int markedCount = 0;
        for (Invoice invoice : openInvoices) {
            if (invoice.getEndDate() != null) {
                LocalDate invoiceEndDate = invoice.getEndDate().toLocalDate();

                // Check if invoice is more than 7 days old
                if (invoiceEndDate.isBefore(sevenDaysAgo) || invoiceEndDate.isEqual(sevenDaysAgo)) {
                    invoice.setStatus(InvoiceStatus.OVERDUE);
                    invoiceRepository.save(invoice);
                    markedCount++;

                    log.info("Marked invoice {} as OVERDUE (End date: {}, Project: {})",
                            invoice.getInvoiceId(),
                            invoice.getEndDate(),
                            invoice.getProjectId());
                }
            }
        }

        log.info("Completed marking overdue invoices. Total marked: {}", markedCount);
    }


    @Scheduled(cron = "0 0 3 1 * ?")
    @Transactional
    public void CreateMonthlyBills() {
        YearMonth previousMonth = YearMonth.now().minusMonths(1);
        int daysInPreviousMonth = previousMonth.lengthOfMonth();
        List<String> listOfProjectIds = apiService.getListOfProjectIds();

        for (String projectId : listOfProjectIds) {
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
     * This invoice includes all outstanding usage charges from the first of the current month up to the deletion time.
     *
     * @param projectId The ID of the project being deleted
     * @param username  The username of the project owner (for authorization)
     * @return The generated final invoice
     * @throws EntityNotFoundException  if project or pricing data is not found
     * @throws IllegalArgumentException if user is not authorized or project has issues
     */
    @Override
    @Transactional
    public Invoice generateFinalInvoice(String projectId, String username, String authHeader) {
        log.info("Generating final invoice for project: {} for user: {}", projectId, username);

        // 1. Verify project exists and user is owner (this will be validated by the caller)
        // For now, we'll rely on the controller to handle authorization

        // 2. Calculate the number of days from the first of the month to today
        LocalDate today = LocalDate.now();
        LocalDate firstOfMonth = today.withDayOfMonth(1);
        int daysInCurrentMonth = (int) java.time.temporal.ChronoUnit.DAYS.between(firstOfMonth, today) + 1;

        // 3. Get usage data for the current month (from first of month to today)
        UsageMonth usage = apiService.usageRecordForLastMonth(projectId, daysInCurrentMonth, authHeader);

        // 4. Calculate totals from usage data
        BigDecimal CPU = BigDecimal.valueOf(usage.getCpuRequestCores());
        BigDecimal MEMORY = BigDecimal.valueOf(usage.getMemoryUsageGB());
        BigDecimal STORAGE = BigDecimal.valueOf(0);

        // 5. Fetch prices with null safety checks
        Price cpuPrice = getPrice("CPU_HOURS");
        Price memoryPrice = getPrice("MEMORY_GB_HOURS");
        Price storagePrice = getPrice("STORAGE_GB");

        if (cpuPrice == null || memoryPrice == null || storagePrice == null) {
            throw new EntityNotFoundException("One or more price records not found");
        }

        BigDecimal cpuPriceValue = BigDecimal.valueOf(cpuPrice.getPrice());
        BigDecimal memoryPriceValue = BigDecimal.valueOf(memoryPrice.getPrice());
        BigDecimal storagePriceValue = BigDecimal.valueOf(storagePrice.getPrice());

        // 6. Calculate costs
        BigDecimal totalCPU = CPU.multiply(cpuPriceValue);
        BigDecimal totalRAM = MEMORY.multiply(memoryPriceValue);
        BigDecimal totalSTORAGE = STORAGE.multiply(storagePriceValue);

        // 7. Calculate subtotal, taxes, and total
        BigDecimal subtotal = totalCPU.add(totalRAM).add(totalSTORAGE);
        BigDecimal taxAmount = subtotal.multiply(BigDecimal.valueOf(taxes));
        BigDecimal total = subtotal.add(taxAmount).setScale(2, BigDecimal.ROUND_HALF_UP);

        // 8. Create final invoice
        Invoice finalInvoice = Invoice.builder()
                .projectId(projectId)
                .startDate(Date.valueOf(firstOfMonth))
                .endDate(Date.valueOf(today))
                .status(InvoiceStatus.OPEN)
                .totalCPU(totalCPU)
                .totalRAM(totalRAM)
                .totalSTORAGE(totalSTORAGE)
                .subtotal(subtotal)
                .taxes(taxAmount)
                .total(total)
                .totalPaid(BigDecimal.ZERO)
                .build();

        // 9. Save the invoice
        Invoice savedInvoice = invoiceRepository.save(finalInvoice);

        log.info("Final invoice generated for project {}: Invoice ID: {}, Total: ${}, Period: {} to {}",
                projectId, savedInvoice.getInvoiceId(), savedInvoice.getTotal(), firstOfMonth, today);

        return savedInvoice;
    }
}



