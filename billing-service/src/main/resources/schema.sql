
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id UUID PRIMARY KEY,
    workspace_id UUID,
    start_date DATE,
    end_date DATE,
    payement_date DATE,
    status VARCHAR(20),
    total_cpu DECIMAL(19,2),
    total_ram DECIMAL(19,2),
    total_storage DECIMAL(19,2),
    subtotal DECIMAL(19,2),
    taxes DECIMAL(19,2),
    total DECIMAL(19,2),
    total_paid DECIMAL(19,2)
    );

CREATE TABLE IF NOT EXISTS prices(
    metric VARCHAR(20) PRIMARY KEY,
    price DOUBLE PRECISION
);
