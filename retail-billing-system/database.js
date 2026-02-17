// IndexedDB Database Management
const DB_NAME = 'RetailBillingDB';
const DB_VERSION = 1;
let db = null;

// Initialize Database
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Customers Store
            if (!db.objectStoreNames.contains('customers')) {
                const customerStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
                customerStore.createIndex('phone', 'phone', { unique: false });
                customerStore.createIndex('name', 'name', { unique: false });
            }

            // Products Store
            if (!db.objectStoreNames.contains('products')) {
                const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                productStore.createIndex('sku', 'sku', { unique: false });
                productStore.createIndex('name', 'name', { unique: false });
            }

            // Invoices Store
            if (!db.objectStoreNames.contains('invoices')) {
                const invoiceStore = db.createObjectStore('invoices', { keyPath: 'id', autoIncrement: true });
                invoiceStore.createIndex('customer_id', 'customer_id', { unique: false });
                invoiceStore.createIndex('date', 'date', { unique: false });
                invoiceStore.createIndex('status', 'status', { unique: false });
            }

            // Expenses Store
            if (!db.objectStoreNames.contains('expenses')) {
                const expenseStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
                expenseStore.createIndex('date', 'date', { unique: false });
                expenseStore.createIndex('category', 'category', { unique: false });
            }

            // Settings Store
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        };
    });
}

// Generic CRUD Operations
function addRecord(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function updateRecord(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function deleteRecord(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function getRecord(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getAllRecords(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Search Records
function searchRecords(storeName, indexName, query) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll();

        request.onsuccess = () => {
            const results = request.result.filter(item =>
                item[indexName].toLowerCase().includes(query.toLowerCase())
            );
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
}

// Settings Management
function getSetting(key, defaultValue = null) {
    return new Promise(async (resolve) => {
        try {
            const setting = await getRecord('settings', key);
            resolve(setting ? setting.value : defaultValue);
        } catch {
            resolve(defaultValue);
        }
    });
}

function setSetting(key, value) {
    return updateRecord('settings', { key, value });
}

// Export/Import Data for MySQL Sync
function exportAllData() {
    return new Promise(async (resolve) => {
        const data = {
            customers: await getAllRecords('customers'),
            products: await getAllRecords('products'),
            invoices: await getAllRecords('invoices'),
            expenses: await getAllRecords('expenses'),
            settings: await getAllRecords('settings'),
            exported_at: new Date().toISOString()
        };
        resolve(data);
    });
}

function importAllData(data) {
    return new Promise(async (resolve, reject) => {
        try {
            const stores = ['customers', 'products', 'invoices', 'expenses', 'settings'];
            for (const store of stores) {
                if (data[store]) {
                    for (const record of data[store]) {
                        await updateRecord(store, record);
                    }
                }
            }
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

// Get Invoice Number
async function getNextInvoiceNumber() {
    const invoices = await getAllRecords('invoices');
    return invoices.length + 1;
}

// Customer Statistics
async function getCustomerStats(customerId) {
    const invoices = await getAllRecords('invoices');
    const customerInvoices = invoices.filter(inv => inv.customer_id === customerId);

    const totalPurchase = customerInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = customerInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
    const pending = totalPurchase - totalPaid;

    return { totalPurchase, totalPaid, pending };
}

// Dashboard Statistics
async function getDashboardStats() {
    const invoices = await getAllRecords('invoices');
    const customers = await getAllRecords('customers');
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);

    const todaySales = invoices
        .filter(inv => inv.date === today)
        .reduce((sum, inv) => sum + inv.total, 0);

    const monthSales = invoices
        .filter(inv => inv.date.startsWith(thisMonth))
        .reduce((sum, inv) => sum + inv.total, 0);

    const pendingPayments = invoices
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + (inv.total - (inv.amount_paid || 0)), 0);

    return {
        todaySales,
        monthSales,
        pendingPayments,
        totalCustomers: customers.length
    };
}


// Get all products
function getProducts() {
    const products = localStorage.getItem('products');
    return products ? JSON.parse(products) : [];
}

// Get all customers
function getCustomers() {
    const customers = localStorage.getItem('customers');
    return customers ? JSON.parse(customers) : [];
}
// Initialize on load
initDB().catch(err => console.error('Database initialization failed:', err));