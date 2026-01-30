package com.kleff.billingservice.buisnesslayer;

import com.kleff.billingservice.datalayer.Allocation.ReservedAllocation;
import com.kleff.billingservice.datalayer.Invoice.Invoice;
import com.kleff.billingservice.datalayer.Pricing.Price;
import com.kleff.billingservice.datalayer.Record.UsageRecord;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface BillingService {
    public Invoice createInvoice(Invoice invoice);
    public void createUsageRecord(UsageRecord record);
    public List<UsageRecord> getUsageRecordsForProject(String projectId);
    public void payInvoice(String invoiceId);
    public void createReservedAllocation(ReservedAllocation reservedAllocation);
    public List<Invoice> getInvoicesForAProject(String projectId);
    public Invoice getInvoiceById(String invoiceId);
    public Price getPrice(String itemId);
    public void setPrice(Price price);
    public long computeOutstandingCents(String invoiceId);
    public List<Price> getPrices();
    public List<Invoice> getNotificationsForProject(String projectId);

}
