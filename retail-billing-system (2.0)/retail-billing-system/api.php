<?php
// Database Configuration
// Update these values according to your MySQL server settings

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'retail_billing');

// Create connection
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Check connection
if ($conn->connect_error) {
    die(json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $conn->connect_error
    ]));
}

// Set charset to utf8mb4
$conn->set_charset('utf8mb4');

// Enable error reporting for development
// Comment out in production
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS Headers - Allow access from anywhere
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Helper function to send JSON response
function sendResponse($success, $data = null, $message = '') {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ]);
    exit();
}

// Helper function to validate required fields
function validateRequired($data, $fields) {
    foreach ($fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            return "Field '$field' is required";
        }
    }
    return null;
}

// Get request method and action
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Route requests
switch ($action) {
    case 'sync':
        handleSync();
        break;
    case 'export':
        handleExport();
        break;
    case 'import':
        handleImport();
        break;
    default:
        sendResponse(false, null, 'Invalid action');
}

// Sync data from IndexedDB to MySQL
function handleSync() {
    global $conn;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendResponse(false, null, 'Invalid JSON data');
    }
    
    try {
        $conn->begin_transaction();
        
        // Sync customers
        if (isset($input['customers'])) {
            foreach ($input['customers'] as $customer) {
                syncCustomer($customer);
            }
        }
        
        // Sync products
        if (isset($input['products'])) {
            foreach ($input['products'] as $product) {
                syncProduct($product);
            }
        }
        
        // Sync invoices
        if (isset($input['invoices'])) {
            foreach ($input['invoices'] as $invoice) {
                syncInvoice($invoice);
            }
        }
        
        // Sync expenses
        if (isset($input['expenses'])) {
            foreach ($input['expenses'] as $expense) {
                syncExpense($expense);
            }
        }
        
        // Sync settings
        if (isset($input['settings'])) {
            foreach ($input['settings'] as $setting) {
                syncSetting($setting);
            }
        }
        
        $conn->commit();
        sendResponse(true, null, 'Data synced successfully');
        
    } catch (Exception $e) {
        $conn->rollback();
        sendResponse(false, null, 'Sync failed: ' . $e->getMessage());
    }
}

// Export all data from MySQL
function handleExport() {
    global $conn;
    
    $data = [
        'customers' => [],
        'products' => [],
        'invoices' => [],
        'expenses' => [],
        'settings' => [],
        'exported_at' => date('Y-m-d H:i:s')
    ];
    
    // Export customers
    $result = $conn->query("SELECT * FROM customers ORDER BY id");
    while ($row = $result->fetch_assoc()) {
        $data['customers'][] = $row;
    }
    
    // Export products
    $result = $conn->query("SELECT * FROM products ORDER BY id");
    while ($row = $result->fetch_assoc()) {
        $data['products'][] = $row;
    }
    
    // Export invoices with items
    $result = $conn->query("SELECT * FROM invoices ORDER BY id");
    while ($row = $result->fetch_assoc()) {
        $invoiceId = $row['id'];
        
        // Get invoice items
        $itemsResult = $conn->query("SELECT * FROM invoice_items WHERE invoice_id = $invoiceId");
        $items = [];
        while ($item = $itemsResult->fetch_assoc()) {
            $items[] = $item;
        }
        
        $row['items'] = $items;
        $data['invoices'][] = $row;
    }
    
    // Export expenses
    $result = $conn->query("SELECT * FROM expenses ORDER BY id");
    while ($row = $result->fetch_assoc()) {
        $data['expenses'][] = $row;
    }
    
    // Export settings
    $result = $conn->query("SELECT * FROM settings");
    while ($row = $result->fetch_assoc()) {
        $data['settings'][] = [
            'key' => $row['setting_key'],
            'value' => $row['setting_value']
        ];
    }
    
    sendResponse(true, $data);
}

// Import data to MySQL
function handleImport() {
    handleSync(); // Same as sync
}

// Individual sync functions
function syncCustomer($customer) {
    global $conn;
    
    $id = isset($customer['id']) ? intval($customer['id']) : null;
    $name = $conn->real_escape_string($customer['name']);
    $phone = $conn->real_escape_string($customer['phone']);
    $email = isset($customer['email']) ? $conn->real_escape_string($customer['email']) : '';
    $address = isset($customer['address']) ? $conn->real_escape_string($customer['address']) : '';
    
    if ($id) {
        $sql = "INSERT INTO customers (id, name, phone, email, address) 
                VALUES ($id, '$name', '$phone', '$email', '$address')
                ON DUPLICATE KEY UPDATE 
                name='$name', phone='$phone', email='$email', address='$address'";
    } else {
        $sql = "INSERT INTO customers (name, phone, email, address) 
                VALUES ('$name', '$phone', '$email', '$address')";
    }
    
    $conn->query($sql);
}

function syncProduct($product) {
    global $conn;
    
    $id = isset($product['id']) ? intval($product['id']) : null;
    $name = $conn->real_escape_string($product['name']);
    $sku = isset($product['sku']) ? $conn->real_escape_string($product['sku']) : '';
    $price = floatval($product['price']);
    $stock = isset($product['stock']) ? intval($product['stock']) : 0;
    $category = isset($product['category']) ? $conn->real_escape_string($product['category']) : '';
    $tax = isset($product['tax']) ? floatval($product['tax']) : 0;
    
    if ($id) {
        $sql = "INSERT INTO products (id, name, sku, price, stock, category, tax) 
                VALUES ($id, '$name', '$sku', $price, $stock, '$category', $tax)
                ON DUPLICATE KEY UPDATE 
                name='$name', sku='$sku', price=$price, stock=$stock, category='$category', tax=$tax";
    } else {
        $sql = "INSERT INTO products (name, sku, price, stock, category, tax) 
                VALUES ('$name', '$sku', $price, $stock, '$category', $tax)";
    }
    
    $conn->query($sql);
}

function syncInvoice($invoice) {
    global $conn;
    
    $id = isset($invoice['id']) ? intval($invoice['id']) : null;
    $invoiceNumber = intval($invoice['invoice_number']);
    $customerId = intval($invoice['customer_id']);
    $date = $conn->real_escape_string($invoice['date']);
    $dueDate = isset($invoice['due_date']) ? "'" . $conn->real_escape_string($invoice['due_date']) . "'" : 'NULL';
    $subtotal = floatval($invoice['subtotal']);
    $tax = floatval($invoice['tax']);
    $total = floatval($invoice['total']);
    $status = $conn->real_escape_string($invoice['status']);
    $amountPaid = isset($invoice['amount_paid']) ? floatval($invoice['amount_paid']) : 0;
    $notes = isset($invoice['notes']) ? $conn->real_escape_string($invoice['notes']) : '';
    
    if ($id) {
        $sql = "INSERT INTO invoices (id, invoice_number, customer_id, date, due_date, subtotal, tax, total, status, amount_paid, notes) 
                VALUES ($id, $invoiceNumber, $customerId, '$date', $dueDate, $subtotal, $tax, $total, '$status', $amountPaid, '$notes')
                ON DUPLICATE KEY UPDATE 
                invoice_number=$invoiceNumber, customer_id=$customerId, date='$date', due_date=$dueDate, 
                subtotal=$subtotal, tax=$tax, total=$total, status='$status', amount_paid=$amountPaid, notes='$notes'";
    } else {
        $sql = "INSERT INTO invoices (invoice_number, customer_id, date, due_date, subtotal, tax, total, status, amount_paid, notes) 
                VALUES ($invoiceNumber, $customerId, '$date', $dueDate, $subtotal, $tax, $total, '$status', $amountPaid, '$notes')";
    }
    
    $conn->query($sql);
    
    // Get the invoice ID
    if (!$id) {
        $id = $conn->insert_id;
    }
    
    // Delete existing items and re-insert
    $conn->query("DELETE FROM invoice_items WHERE invoice_id = $id");
    
    // Insert invoice items
    if (isset($invoice['items']) && is_array($invoice['items'])) {
        foreach ($invoice['items'] as $item) {
            $productId = intval($item['product_id']);
            $quantity = floatval($item['quantity']);
            $price = floatval($item['price']);
            $itemTax = floatval($item['tax']);
            $itemTotal = floatval($item['total']);
            
            $conn->query("INSERT INTO invoice_items (invoice_id, product_id, quantity, price, tax, total) 
                         VALUES ($id, $productId, $quantity, $price, $itemTax, $itemTotal)");
        }
    }
}

function syncExpense($expense) {
    global $conn;
    
    $id = isset($expense['id']) ? intval($expense['id']) : null;
    $date = $conn->real_escape_string($expense['date']);
    $category = $conn->real_escape_string($expense['category']);
    $description = isset($expense['description']) ? $conn->real_escape_string($expense['description']) : '';
    $amount = floatval($expense['amount']);
    
    if ($id) {
        $sql = "INSERT INTO expenses (id, date, category, description, amount) 
                VALUES ($id, '$date', '$category', '$description', $amount)
                ON DUPLICATE KEY UPDATE 
                date='$date', category='$category', description='$description', amount=$amount";
    } else {
        $sql = "INSERT INTO expenses (date, category, description, amount) 
                VALUES ('$date', '$category', '$description', $amount)";
    }
    
    $conn->query($sql);
}

function syncSetting($setting) {
    global $conn;
    
    $key = $conn->real_escape_string($setting['key']);
    $value = $conn->real_escape_string($setting['value']);
    
    $sql = "INSERT INTO settings (setting_key, setting_value) 
            VALUES ('$key', '$value')
            ON DUPLICATE KEY UPDATE setting_value='$value'";
    
    $conn->query($sql);
}

$conn->close();
?>