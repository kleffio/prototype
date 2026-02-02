package com.kleff.billingservice.datalayer.Invoice;

import com.kleff.billingservice.datalayer.Record.UsageRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, String> {
    public Invoice findByInvoiceId(String invoiceId);
    public List<Invoice> findByProjectId(String projectId);
    public List<Invoice> findByProjectIdIn(List<String> projectIds);
}
