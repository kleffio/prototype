package com.kleff.billingservice.datalayer.Invoice;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.sql.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "invoices")
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String invoiceId;
    String projectId;
    Date startDate;
    Date endDate;
    Date paymentDate;
    InvoiceStatus status;
    BigDecimal totalCPU;
    BigDecimal totalRAM;
    BigDecimal totalSTORAGE;
    BigDecimal subtotal;
    BigDecimal taxes;
    BigDecimal total;
    BigDecimal totalPaid;
}
