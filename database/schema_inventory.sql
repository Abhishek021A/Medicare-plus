-- Add low_stock_threshold to products if it doesn't exist
SET @dbname = 'pharmacy_store';
SET @tablename = 'products';
SET @columnname = 'low_stock_threshold';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " INT DEFAULT 10;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    type ENUM('Add Stock', 'Remove Stock', 'Set Stock', 'Order', 'Order Cancellation') NOT NULL,
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reason VARCHAR(100),
    notes TEXT,
    admin_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Add index on product_id and created_at for fast history queries
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON inventory_transactions(created_at);
