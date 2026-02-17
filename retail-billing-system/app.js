// Global Variables
let currentPage = 'dashboard';
let editingInvoiceId = null;
let editingCustomerId = null;
let editingProductId = null;

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    setupNavigation();
    setupEventListeners();
    setDefaultDates();
    await loadDashboard();
    await loadCustomerDropdown();
    await loadProductDropdowns();
    checkPaymentReminders();
});

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateToPage(page);
        });
    });
}

function navigateToPage(page) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) {
            link.classList.add('active');
        }
    });

    // Update active page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');

    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'new-invoice': 'New Invoice',
        'invoices': 'Invoices',
        'customers': 'Customers',
        'products': 'Products',
        'expenses': 'Expenses',
        'reports': 'Reports',
        'settings': 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[page];

    // Load page data
    currentPage = page;
    loadPageData(page);
}

async function loadPageData(page) {
    switch(page) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'invoices':
            await loadInvoices();
            break;
        case 'customers':
            await loadCustomers();
            break;
        case 'products':
            await loadProducts();
            break;
        case 'expenses':
            await loadExpenses();
            break;
        case 'settings':
            await loadSettings();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    const stats = await getDashboardStats();
    
    document.getElementById('todaySales').textContent = `₹${stats.todaySales.toFixed(2)}`;
    document.getElementById('monthSales').textContent = `₹${stats.monthSales.toFixed(2)}`;
    document.getElementById('pendingPayments').textContent = `₹${stats.pendingPayments.toFixed(2)}`;
    document.getElementById('totalCustomers').textContent = stats.totalCustomers;

    await loadRecentInvoices();
    await loadPaymentReminders();
}

async function loadRecentInvoices() {
    const invoices = await getAllRecords('invoices');
    const customers = await getAllRecords('customers');
    const recent = invoices.slice(-5).reverse();

    const container = document.getElementById('recentInvoices');
    container.innerHTML = recent.map(inv => {
        const customer = customers.find(c => c.id === inv.customer_id);
        return `
            <div class="list-item">
                <div>
                    <strong>#${inv.invoice_number}</strong> - ${customer ? customer.name : 'N/A'}
                    <br><small>${inv.date}</small>
                </div>
                <div>
                    <strong>₹${inv.total.toFixed(2)}</strong>
                    <br><span class="status-badge status-${inv.status}">${inv.status}</span>
                </div>
            </div>
        `;
    }).join('') || '<p>No invoices yet</p>';
}

async function loadPaymentReminders() {
    const invoices = await getAllRecords('invoices');
    const customers = await getAllRecords('customers');
    const today = new Date();
    
    const pending = invoices.filter(inv => {
        if (inv.status === 'paid' || !inv.due_date) return false;
        const dueDate = new Date(inv.due_date);
        return dueDate <= today;
    });

    const container = document.getElementById('paymentReminders');
    document.getElementById('notificationBadge').textContent = pending.length;

    container.innerHTML = pending.map(inv => {
        const customer = customers.find(c => c.id === inv.customer_id);
        const overdueDays = Math.floor((today - new Date(inv.due_date)) / (1000 * 60 * 60 * 24));
        return `
            <div class="list-item">
                <div>
                    <strong>${customer ? customer.name : 'N/A'}</strong>
                    <br><small>Invoice #${inv.invoice_number} - ${overdueDays} days overdue</small>
                </div>
                <button class="btn-whatsapp action-btn" onclick="sendWhatsAppReminder(${inv.id})">
                    Send Reminder
                </button>
            </div>
        `;
    }).join('') || '<p>No pending payments</p>';
}

// Invoice Form
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    document.getElementById('expenseDate').value = today;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
}

function addInvoiceItem() {
    const tbody = document.getElementById('invoiceItems');
    const row = document.createElement('tr');
    row.className = 'item-row';
    row.innerHTML = `
        <td>
            <select class="item-product" onchange="selectProduct(this)" required>
                <option value="">Select Product</option>
            </select>
        </td>
        <td><input type="number" class="item-qty" value="1" min="1" oninput="calculateItemTotal(this)"></td>
        <td><input type="number" class="item-price" step="0.01" min="0" oninput="calculateItemTotal(this)"></td>
        <td><input type="number" class="item-tax" value="0" min="0" max="100" step="0.01" oninput="calculateItemTotal(this)"></td>
        <td><input type="number" class="item-total" readonly></td>
        <td><button type="button" class="btn-delete" onclick="removeItem(this)">🗑️</button></td>
    `;
    tbody.appendChild(row);
    loadProductDropdownInRow(row);
}

function removeItem(btn) {
    const row = btn.closest('tr');
    row.remove();
    calculateInvoiceTotal();
}

async function selectProduct(select) {
    const productId = parseInt(select.value);
    if (!productId) return;

    const product = await getRecord('products', productId);
    const row = select.closest('tr');
    
    row.querySelector('.item-price').value = product.price;
    row.querySelector('.item-tax').value = product.tax || 0;
    
    calculateItemTotal(row.querySelector('.item-qty'));
}

function calculateItemTotal(input) {
    const row = input.closest('tr');
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    const tax = parseFloat(row.querySelector('.item-tax').value) || 0;
    
    const subtotal = qty * price;
    const taxAmount = subtotal * (tax / 100);
    const total = subtotal + taxAmount;
    
    row.querySelector('.item-total').value = total.toFixed(2);
    calculateInvoiceTotal();
}

function calculateInvoiceTotal() {
    let subtotal = 0;
    let totalTax = 0;
    
    document.querySelectorAll('.item-row').forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const tax = parseFloat(row.querySelector('.item-tax').value) || 0;
        
        const itemSubtotal = qty * price;
        const itemTax = itemSubtotal * (tax / 100);
        
        subtotal += itemSubtotal;
        totalTax += itemTax;
    });
    
    const grandTotal = subtotal + totalTax;
    
    document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('totalTax').textContent = `₹${totalTax.toFixed(2)}`;
    document.getElementById('grandTotal').textContent = `₹${grandTotal.toFixed(2)}`;
}

// Event Listeners
function setupEventListeners() {
    // Invoice Form
    document.getElementById('invoiceForm').addEventListener('submit', saveInvoice);
    
    // Customer Form
    document.getElementById('customerForm').addEventListener('submit', saveCustomer);
    
    // Product Form
    document.getElementById('productForm').addEventListener('submit', saveProduct);
    
    // Expense Form
    document.getElementById('expenseForm').addEventListener('submit', saveExpense);
    
    // Search boxes
    document.getElementById('searchInvoices').addEventListener('input', (e) => {
        searchInvoicesLocal(e.target.value);
    });
    
    document.getElementById('searchCustomers').addEventListener('input', (e) => {
        searchCustomersLocal(e.target.value);
    });
    
    document.getElementById('searchProducts').addEventListener('input', (e) => {
        searchProductsLocal(e.target.value);
    });
    
    document.getElementById('searchExpenses').addEventListener('input', (e) => {
        searchExpensesLocal(e.target.value);
    });
}

// Save Invoice
async function saveInvoice(e) {
    e.preventDefault();
    
    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        const productId = parseInt(row.querySelector('.item-product').value);
        if (!productId) return;
        
        items.push({
            product_id: productId,
            quantity: parseFloat(row.querySelector('.item-qty').value),
            price: parseFloat(row.querySelector('.item-price').value),
            tax: parseFloat(row.querySelector('.item-tax').value),
            total: parseFloat(row.querySelector('.item-total').value)
        });
    });
    
    if (items.length === 0) {
        alert('Please add at least one item');
        return;
    }
    
    const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('₹', ''));
    const tax = parseFloat(document.getElementById('totalTax').textContent.replace('₹', ''));
    const total = parseFloat(document.getElementById('grandTotal').textContent.replace('₹', ''));
    
    const invoice = {
        invoice_number: await getNextInvoiceNumber(),
        customer_id: parseInt(document.getElementById('invoiceCustomer').value),
        date: document.getElementById('invoiceDate').value,
        due_date: document.getElementById('dueDate').value,
        items: items,
        subtotal: subtotal,
        tax: tax,
        total: total,
        status: document.getElementById('paymentStatus').value,
        amount_paid: parseFloat(document.getElementById('amountPaid').value) || 0,
        notes: document.getElementById('invoiceNotes').value,
        created_at: new Date().toISOString()
    };
    
    await addRecord('invoices', invoice);
    alert('Invoice saved successfully!');
    resetInvoiceForm();
    navigateToPage('invoices');
}

function resetInvoiceForm() {
    document.getElementById('invoiceForm').reset();
    const tbody = document.getElementById('invoiceItems');
    tbody.innerHTML = `
        <tr class="item-row">
            <td>
                <select class="item-product" onchange="selectProduct(this)" required>
                    <option value="">Select Product</option>
                </select>
            </td>
            <td><input type="number" class="item-qty" value="1" min="1" oninput="calculateItemTotal(this)"></td>
            <td><input type="number" class="item-price" step="0.01" min="0" oninput="calculateItemTotal(this)"></td>
            <td><input type="number" class="item-tax" value="0" min="0" max="100" step="0.01" oninput="calculateItemTotal(this)"></td>
            <td><input type="number" class="item-total" readonly></td>
            <td><button type="button" class="btn-delete" onclick="removeItem(this)">🗑️</button></td>
        </tr>
    `;
    loadProductDropdowns();
    setDefaultDates();
    calculateInvoiceTotal();
}

// Load Invoices
async function loadInvoices() {
    const invoices = await getAllRecords('invoices');
    const customers = await getAllRecords('customers');
    const filterStatus = document.getElementById('filterStatus').value;
    
    let filtered = invoices;
    if (filterStatus) {
        filtered = invoices.filter(inv => inv.status === filterStatus);
    }
    
    const tbody = document.getElementById('invoicesTable');
    tbody.innerHTML = filtered.reverse().map(inv => {
        const customer = customers.find(c => c.id === inv.customer_id);
        return `
            <tr>
                <td>#${inv.invoice_number}</td>
                <td>${inv.date}</td>
                <td>${customer ? customer.name : 'N/A'}</td>
                <td>₹${inv.total.toFixed(2)}</td>
                <td>₹${(inv.amount_paid || 0).toFixed(2)}</td>
                <td><span class="status-badge status-${inv.status}">${inv.status}</span></td>
                <td>
                    <button class="action-btn btn-view" onclick="viewInvoice(${inv.id})">View</button>
                    <button class="action-btn btn-print" onclick="printInvoiceById(${inv.id})">Print</button>
                    <button class="action-btn btn-whatsapp" onclick="sendInvoiceViaWhatsApp(${inv.id})">WhatsApp</button>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="7">No invoices found</td></tr>';
}

async function searchInvoicesLocal(query) {
    const invoices = await getAllRecords('invoices');
    const customers = await getAllRecords('customers');
    
    const filtered = invoices.filter(inv => {
        const customer = customers.find(c => c.id === inv.customer_id);
        return (
            inv.invoice_number.toString().includes(query) ||
            (customer && customer.name.toLowerCase().includes(query.toLowerCase()))
        );
    });
    
    const tbody = document.getElementById('invoicesTable');
    tbody.innerHTML = filtered.reverse().map(inv => {
        const customer = customers.find(c => c.id === inv.customer_id);
        return `
            <tr>
                <td>#${inv.invoice_number}</td>
                <td>${inv.date}</td>
                <td>${customer ? customer.name : 'N/A'}</td>
                <td>₹${inv.total.toFixed(2)}</td>
                <td>₹${(inv.amount_paid || 0).toFixed(2)}</td>
                <td><span class="status-badge status-${inv.status}">${inv.status}</span></td>
                <td>
                    <button class="action-btn btn-view" onclick="viewInvoice(${inv.id})">View</button>
                    <button class="action-btn btn-print" onclick="printInvoiceById(${inv.id})">Print</button>
                    <button class="action-btn btn-whatsapp" onclick="sendInvoiceViaWhatsApp(${inv.id})">WhatsApp</button>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="7">No invoices found</td></tr>';
}

// Customers
function showAddCustomerModal() {
    document.getElementById('customerModal').classList.add('active');
    document.getElementById('customerForm').reset();
    editingCustomerId = null;
}

async function saveCustomer(e) {
    e.preventDefault();
    
    const customer = {
        name: document.getElementById('customerName').value,
        phone: document.getElementById('customerPhone').value,
        email: document.getElementById('customerEmail').value,
        address: document.getElementById('customerAddress').value,
        created_at: new Date().toISOString()
    };
    
    if (editingCustomerId) {
        customer.id = editingCustomerId;
        await updateRecord('customers', customer);
    } else {
        await addRecord('customers', customer);
    }
    
    closeModal('customerModal');
    await loadCustomers();
    await loadCustomerDropdown();
    alert('Customer saved successfully!');
}

async function loadCustomers() {
    const customers = await getAllRecords('customers');
    
    const tbody = document.getElementById('customersTable');
    tbody.innerHTML = await Promise.all(customers.map(async customer => {
        const stats = await getCustomerStats(customer.id);
        return `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.phone}</td>
                <td>${customer.email || '-'}</td>
                <td>₹${stats.totalPurchase.toFixed(2)}</td>
                <td>₹${stats.pending.toFixed(2)}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="editCustomer(${customer.id})">Edit</button>
                    <button class="action-btn btn-view" onclick="viewCustomerHistory(${customer.id})">History</button>
                    <button class="action-btn btn-whatsapp" onclick="sendWhatsAppToCustomer('${customer.phone}')">WhatsApp</button>
                </td>
            </tr>
        `;
    })).then(rows => rows.join('')) || '<tr><td colspan="6">No customers found</td></tr>';
}

async function searchCustomersLocal(query) {
    const customers = await getAllRecords('customers');
    const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.phone.includes(query)
    );
    
    const tbody = document.getElementById('customersTable');
    tbody.innerHTML = await Promise.all(filtered.map(async customer => {
        const stats = await getCustomerStats(customer.id);
        return `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.phone}</td>
                <td>${customer.email || '-'}</td>
                <td>₹${stats.totalPurchase.toFixed(2)}</td>
                <td>₹${stats.pending.toFixed(2)}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="editCustomer(${customer.id})">Edit</button>
                    <button class="action-btn btn-view" onclick="viewCustomerHistory(${customer.id})">History</button>
                    <button class="action-btn btn-whatsapp" onclick="sendWhatsAppToCustomer('${customer.phone}')">WhatsApp</button>
                </td>
            </tr>
        `;
    })).then(rows => rows.join(''));
}

async function editCustomer(id) {
    const customer = await getRecord('customers', id);
    document.getElementById('customerName').value = customer.name;
    document.getElementById('customerPhone').value = customer.phone;
    document.getElementById('customerEmail').value = customer.email || '';
    document.getElementById('customerAddress').value = customer.address || '';
    editingCustomerId = id;
    showAddCustomerModal();
}

async function viewCustomerHistory(customerId) {
    const invoices = await getAllRecords('invoices');
    const customer = await getRecord('customers', customerId);
    const customerInvoices = invoices.filter(inv => inv.customer_id === customerId);
    
    let historyHTML = `
        <h2>${customer.name} - Purchase History</h2>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    customerInvoices.forEach(inv => {
        historyHTML += `
            <tr>
                <td>#${inv.invoice_number}</td>
                <td>${inv.date}</td>
                <td>₹${inv.total.toFixed(2)}</td>
                <td><span class="status-badge status-${inv.status}">${inv.status}</span></td>
            </tr>
        `;
    });
    
    historyHTML += '</tbody></table>';
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            ${historyHTML}
        </div>
    `;
    document.body.appendChild(modal);
}

async function loadCustomerDropdown() {
    const customers = await getAllRecords('customers');
    const select = document.getElementById('invoiceCustomer');
    select.innerHTML = '<option value="">Select Customer</option>' +
        customers.map(c => `<option value="${c.id}">${c.name} - ${c.phone}</option>`).join('');
}

// Products
function showAddProductModal() {
    document.getElementById('productModal').classList.add('active');
    document.getElementById('productForm').reset();
    editingProductId = null;
}

async function saveProduct(e) {
    e.preventDefault();
    
    const product = {
        name: document.getElementById('productName').value,
        sku: document.getElementById('productSKU').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        category: document.getElementById('productCategory').value,
        tax: parseFloat(document.getElementById('productTax').value),
        created_at: new Date().toISOString()
    };
    
    if (editingProductId) {
        product.id = editingProductId;
        await updateRecord('products', product);
    } else {
        await addRecord('products', product);
    }
    
    closeModal('productModal');
    await loadProducts();
    await loadProductDropdowns();
    alert('Product saved successfully!');
}

async function loadProducts() {
    const products = await getAllRecords('products');
    
    const tbody = document.getElementById('productsTable');
    tbody.innerHTML = products.map(product => `
        <tr>
            <td>${product.name}</td>
            <td>${product.sku || '-'}</td>
            <td>₹${product.price.toFixed(2)}</td>
            <td>${product.stock || 0}</td>
            <td>${product.category || '-'}</td>
            <td>
                <button class="action-btn btn-edit" onclick="editProduct(${product.id})">Edit</button>
                <button class="action-btn btn-delete" onclick="deleteProduct(${product.id})">Delete</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6">No products found</td></tr>';
}

async function searchProductsLocal(query) {
    const products = await getAllRecords('products');
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(query.toLowerCase()))
    );
    
    const tbody = document.getElementById('productsTable');
    tbody.innerHTML = filtered.map(product => `
        <tr>
            <td>${product.name}</td>
            <td>${product.sku || '-'}</td>
            <td>₹${product.price.toFixed(2)}</td>
            <td>${product.stock || 0}</td>
            <td>${product.category || '-'}</td>
            <td>
                <button class="action-btn btn-edit" onclick="editProduct(${product.id})">Edit</button>
                <button class="action-btn btn-delete" onclick="deleteProduct(${product.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function editProduct(id) {
    const product = await getRecord('products', id);
    document.getElementById('productName').value = product.name;
    document.getElementById('productSKU').value = product.sku || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock || 0;
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productTax').value = product.tax || 0;
    editingProductId = id;
    showAddProductModal();
}

async function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        await deleteRecord('products', id);
        await loadProducts();
        await loadProductDropdowns();
    }
}

async function loadProductDropdowns() {
    const products = await getAllRecords('products');
    document.querySelectorAll('.item-product').forEach(select => {
        select.innerHTML = '<option value="">Select Product</option>' +
            products.map(p => `<option value="${p.id}">${p.name} - ₹${p.price}</option>`).join('');
    });
}

async function loadProductDropdownInRow(row) {
    const products = await getAllRecords('products');
    const select = row.querySelector('.item-product');
    select.innerHTML = '<option value="">Select Product</option>' +
        products.map(p => `<option value="${p.id}">${p.name} - ₹${p.price}</option>`).join('');
}

// Expenses
function showAddExpenseModal() {
    document.getElementById('expenseModal').classList.add('active');
    document.getElementById('expenseForm').reset();
    setDefaultDates();
}

async function saveExpense(e) {
    e.preventDefault();
    
    const expense = {
        date: document.getElementById('expenseDate').value,
        category: document.getElementById('expenseCategory').value,
        description: document.getElementById('expenseDescription').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        created_at: new Date().toISOString()
    };
    
    await addRecord('expenses', expense);
    closeModal('expenseModal');
    await loadExpenses();
    alert('Expense saved successfully!');
}

async function loadExpenses() {
    const expenses = await getAllRecords('expenses');
    const monthFilter = document.getElementById('expenseMonth').value;
    
    let filtered = expenses;
    if (monthFilter) {
        filtered = expenses.filter(exp => exp.date.startsWith(monthFilter));
    }
    
    const tbody = document.getElementById('expensesTable');
    tbody.innerHTML = filtered.reverse().map(expense => `
        <tr>
            <td>${expense.date}</td>
            <td>${expense.category}</td>
            <td>${expense.description || '-'}</td>
            <td>₹${expense.amount.toFixed(2)}</td>
            <td>
                <button class="action-btn btn-delete" onclick="deleteExpense(${expense.id})">Delete</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="5">No expenses found</td></tr>';
    
    const total = filtered.reduce((sum, exp) => sum + exp.amount, 0);
    document.getElementById('totalExpenses').textContent = `₹${total.toFixed(2)}`;
}

async function searchExpensesLocal(query) {
    const expenses = await getAllRecords('expenses');
    const filtered = expenses.filter(exp => 
        exp.category.toLowerCase().includes(query.toLowerCase()) ||
        (exp.description && exp.description.toLowerCase().includes(query.toLowerCase()))
    );
    
    const tbody = document.getElementById('expensesTable');
    tbody.innerHTML = filtered.reverse().map(expense => `
        <tr>
            <td>${expense.date}</td>
            <td>${expense.category}</td>
            <td>${expense.description || '-'}</td>
            <td>₹${expense.amount.toFixed(2)}</td>
            <td>
                <button class="action-btn btn-delete" onclick="deleteExpense(${expense.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        await deleteRecord('expenses', id);
        await loadExpenses();
    }
}

// Reports
async function generateReport() {
    const fromDate = document.getElementById('reportFromDate').value;
    const toDate = document.getElementById('reportToDate').value;
    
    if (!fromDate || !toDate) {
        alert('Please select date range');
        return;
    }
    
    const invoices = await getAllRecords('invoices');
    const expenses = await getAllRecords('expenses');
    
    const filteredInvoices = invoices.filter(inv => 
        inv.date >= fromDate && inv.date <= toDate
    );
    
    const filteredExpenses = expenses.filter(exp => 
        exp.date >= fromDate && exp.date <= toDate
    );
    
    const totalSales = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
    const totalPending = totalSales - totalPaid;
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalPaid - totalExpenses;
    
    const reportHTML = `
        <div class="report-section">
            <h3>Sales Summary</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-info">
                        <h3>Total Sales</h3>
                        <p class="stat-value">₹${totalSales.toFixed(2)}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-info">
                        <h3>Paid Amount</h3>
                        <p class="stat-value">₹${totalPaid.toFixed(2)}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-info">
                        <h3>Pending Amount</h3>
                        <p class="stat-value">₹${totalPending.toFixed(2)}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-info">
                        <h3>Total Invoices</h3>
                        <p class="stat-value">${filteredInvoices.length}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="report-section">
            <h3>Expenses Summary</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-info">
                        <h3>Total Expenses</h3>
                        <p class="stat-value">₹${totalExpenses.toFixed(2)}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-info">
                        <h3>Net Profit</h3>
                        <p class="stat-value" style="color: ${netProfit >= 0 ? 'green' : 'red'}">₹${netProfit.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="report-section">
            <h3>Expense Breakdown by Category</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${getExpenseByCategoryHTML(filteredExpenses, totalExpenses)}
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('reportResults').innerHTML = reportHTML;
}

function getExpenseByCategoryHTML(expenses, total) {
    const categories = {};
    expenses.forEach(exp => {
        categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
    });
    
    return Object.entries(categories).map(([category, amount]) => `
        <tr>
            <td>${category}</td>
            <td>₹${amount.toFixed(2)}</td>
            <td>${((amount / total) * 100).toFixed(1)}%</td>
        </tr>
    `).join('') || '<tr><td colspan="3">No expenses</td></tr>';
}

// Settings
async function loadSettings() {
    document.getElementById('businessName').value = await getSetting('business_name', '');
    document.getElementById('businessAddress').value = await getSetting('business_address', '');
    document.getElementById('businessPhone').value = await getSetting('business_phone', '');
    document.getElementById('businessEmail').value = await getSetting('business_email', '');
    document.getElementById('gstNumber').value = await getSetting('gst_number', '');
    document.getElementById('reminderDays').value = await getSetting('reminder_days', 3);
    document.getElementById('reminderTemplate').value = await getSetting('reminder_template', document.getElementById('reminderTemplate').value);
}

async function saveSettings() {
    await setSetting('business_name', document.getElementById('businessName').value);
    await setSetting('business_address', document.getElementById('businessAddress').value);
    await setSetting('business_phone', document.getElementById('businessPhone').value);
    await setSetting('business_email', document.getElementById('businessEmail').value);
    await setSetting('gst_number', document.getElementById('gstNumber').value);
    await setSetting('reminder_days', document.getElementById('reminderDays').value);
    await setSetting('reminder_template', document.getElementById('reminderTemplate').value);
    alert('Settings saved successfully!');
}

// WhatsApp Integration
async function sendWhatsAppReminder(invoiceId) {
    const invoice = await getRecord('invoices', invoiceId);
    const customer = await getRecord('customers', invoice.customer_id);
    const businessName = await getSetting('business_name', 'Our Store');
    const template = await getSetting('reminder_template', '');
    
    const message = template
        .replace('{customer_name}', customer.name)
        .replace('{amount}', invoice.total - (invoice.amount_paid || 0))
        .replace('{invoice_number}', invoice.invoice_number)
        .replace('{due_date}', invoice.due_date)
        .replace('{business_name}', businessName);
    
    const whatsappURL = `https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, '_blank');
}

async function sendInvoiceViaWhatsApp(invoiceId) {
    const invoice = await getRecord('invoices', invoiceId);
    const customer = await getRecord('customers', invoice.customer_id);
    const businessName = await getSetting('business_name', 'Our Store');
    
    const message = `Hello ${customer.name},

Thank you for your purchase!

Invoice #${invoice.invoice_number}
Date: ${invoice.date}
Total Amount: ₹${invoice.total.toFixed(2)}
${invoice.status !== 'paid' ? `Due Date: ${invoice.due_date}\nPending: ₹${(invoice.total - (invoice.amount_paid || 0)).toFixed(2)}` : 'Status: Paid'}

${businessName}`;
    
    const whatsappURL = `https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, '_blank');
}

function sendWhatsAppToCustomer(phone) {
    const whatsappURL = `https://wa.me/${phone}`;
    window.open(whatsappURL, '_blank');
}

// Print Functions
async function printInvoice() {
    alert('Print preview will open. Please complete the invoice first.');
}

async function printInvoiceById(invoiceId) {
    const invoice = await getRecord('invoices', invoiceId);
    const customer = await getRecord('customers', invoice.customer_id);
    const products = await getAllRecords('products');
    const businessName = await getSetting('business_name', 'YOUR BUSINESS NAME');
    const businessAddress = await getSetting('business_address', '');
    const businessPhone = await getSetting('business_phone', '');
    const gstNumber = await getSetting('gst_number', '');
    
    let printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice #${invoice.invoice_number}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .header h1 { margin: 0; }
                .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .info-box { width: 48%; }
                .info-box h3 { margin: 0 0 10px 0; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .total-section { text-align: right; margin-top: 20px; }
                .total-row { margin: 5px 0; }
                .grand-total { font-size: 1.2em; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${businessName}</h1>
                <p>${businessAddress}</p>
                <p>Phone: ${businessPhone} ${gstNumber ? '| GST: ' + gstNumber : ''}</p>
            </div>
            
            <div class="info-section">
                <div class="info-box">
                    <h3>Bill To:</h3>
                    <p><strong>${customer.name}</strong></p>
                    <p>${customer.phone}</p>
                    <p>${customer.email || ''}</p>
                    <p>${customer.address || ''}</p>
                </div>
                <div class="info-box">
                    <h3>Invoice Details:</h3>
                    <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
                    <p><strong>Date:</strong> ${invoice.date}</p>
                    <p><strong>Due Date:</strong> ${invoice.due_date || '-'}</p>
                    <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Tax %</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    invoice.items.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        printHTML += `
            <tr>
                <td>${product ? product.name : 'Unknown'}</td>
                <td>${item.quantity}</td>
                <td>₹${item.price.toFixed(2)}</td>
                <td>${item.tax}%</td>
                <td>₹${item.total.toFixed(2)}</td>
            </tr>
        `;
    });
    
    printHTML += `
                </tbody>
            </table>
            
            <div class="total-section">
                <div class="total-row">Subtotal: ₹${invoice.subtotal.toFixed(2)}</div>
                <div class="total-row">Tax: ₹${invoice.tax.toFixed(2)}</div>
                <div class="total-row grand-total">Grand Total: ₹${invoice.total.toFixed(2)}</div>
                ${invoice.amount_paid ? `<div class="total-row">Paid: ₹${invoice.amount_paid.toFixed(2)}</div>` : ''}
                ${invoice.amount_paid && invoice.amount_paid < invoice.total ? `<div class="total-row">Balance: ₹${(invoice.total - invoice.amount_paid).toFixed(2)}</div>` : ''}
            </div>
            
            ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
            
            <p style="text-align: center; margin-top: 40px; font-size: 0.9em;">Thank you for your business!</p>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.print();
}

async function viewInvoice(invoiceId) {
    await printInvoiceById(invoiceId);
}

// Modal Functions
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Sync Functions
async function syncData() {
    alert('Sync functionality requires MySQL backend setup. Data is currently stored offline in IndexedDB.');
    // This is where you would implement MySQL sync
    // Example: Send data to PHP backend using fetch()
}

function showNotifications() {
    alert('Check Payment Reminders section on Dashboard for pending payments.');
}

// Check Payment Reminders
async function checkPaymentReminders() {
    const invoices = await getAllRecords('invoices');
    const reminderDays = parseInt(await getSetting('reminder_days', 3));
    const today = new Date();
    
    const upcomingDue = invoices.filter(inv => {
        if (inv.status === 'paid' || !inv.due_date) return false;
        const dueDate = new Date(inv.due_date);
        const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= reminderDays && daysUntilDue >= 0;
    });
    
    if (upcomingDue.length > 0) {
        console.log(`${upcomingDue.length} invoices due soon`);
    }
}



// Load products into invoice form dropdowns
function loadProductsToInvoice() {
    const products = getProducts(); // Get products from database
    const productSelects = document.querySelectorAll('.item-product');
    
    productSelects.forEach(select => {
        // Clear existing options except first one
        select.innerHTML = '<option value="">Select Product</option>';
        
        // Add each product as an option
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} - ₹${product.price}`;
            option.dataset.price = product.price;
            option.dataset.tax = product.tax || 0;
            option.dataset.stock = product.stock || 0;
            select.appendChild(option);
        });
    });
}

// Load customers into invoice form dropdown
function loadCustomersToInvoice() {
    const customers = getCustomers(); // Get customers from database
    const customerSelect = document.getElementById('invoiceCustomer');
    
    customerSelect.innerHTML = '<option value="">Select Customer</option>';
    
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = `${customer.name} - ${customer.phone}`;
        customerSelect.appendChild(option);
    });
}

// Function to handle product selection
function selectProduct(selectElement) {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const row = selectElement.closest('tr');
    
    if (selectedOption.value) {
        // Auto-fill price and tax
        row.querySelector('.item-price').value = selectedOption.dataset.price || 0;
        row.querySelector('.item-tax').value = selectedOption.dataset.tax || 0;
        
        // Calculate total
        calculateItemTotal(row.querySelector('.item-qty'));
    }
}

// Add new invoice item row
function addInvoiceItem() {
    const tbody = document.getElementById('invoiceItems');
    const newRow = tbody.rows[0].cloneNode(true);
    
    // Reset values
    newRow.querySelectorAll('input').forEach(input => {
        if (input.classList.contains('item-qty')) {
            input.value = 1;
        } else {
            input.value = '';
        }
    });
    newRow.querySelector('select').selectedIndex = 0;
    
    tbody.appendChild(newRow);
    
    // Load products into the new dropdown
    loadProductsToInvoice();
}

// Calculate item total
function calculateItemTotal(element) {
    const row = element.closest('tr');
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    const taxPercent = parseFloat(row.querySelector('.item-tax').value) || 0;
    
    const subtotal = qty * price;
    const taxAmount = (subtotal * taxPercent) / 100;
    const total = subtotal + taxAmount;
    
    row.querySelector('.item-total').value = total.toFixed(2);
    
    // Update invoice totals
    updateInvoiceTotals();
}

// Update invoice summary totals
function updateInvoiceTotals() {
    const rows = document.querySelectorAll('#invoiceItems tr');
    let subtotal = 0;
    let totalTax = 0;
    
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const taxPercent = parseFloat(row.querySelector('.item-tax').value) || 0;
        
        const itemSubtotal = qty * price;
        const itemTax = (itemSubtotal * taxPercent) / 100;
        
        subtotal += itemSubtotal;
        totalTax += itemTax;
    });
    
    const grandTotal = subtotal + totalTax;
    
    document.getElementById('subtotal').textContent = '₹' + subtotal.toFixed(2);
    document.getElementById('totalTax').textContent = '₹' + totalTax.toFixed(2);
    document.getElementById('grandTotal').textContent = '₹' + grandTotal.toFixed(2);
}

// Call these functions when page loads or when switching to invoice page
document.addEventListener('DOMContentLoaded', function() {
    loadProductsToInvoice();
    loadCustomersToInvoice();
    
    // Set today's date by default
    document.getElementById('invoiceDate').valueAsDate = new Date();
});

// Also reload when navigating to new-invoice page
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function() {
        const page = this.dataset.page;
        if (page === 'new-invoice') {
            setTimeout(() => {
                loadProductsToInvoice();
                loadCustomersToInvoice();
            }, 100);
        }
    });
});