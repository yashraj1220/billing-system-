// Add sample data for testing
async function addSampleData() {
    if (!confirm('This will add sample customers and products. Continue?')) {
        return;
    }

    try {
        // Sample Customers
        const sampleCustomers = [
            {
                name: 'Rajesh Kumar',
                phone: '+919876543210',
                email: 'rajesh@example.com',
                address: '123 MG Road, Bangalore, Karnataka 560001',
                created_at: new Date().toISOString()
            },
            {
                name: 'Priya Sharma',
                phone: '+919876543211',
                email: 'priya@example.com',
                address: '456 Park Street, Mumbai, Maharashtra 400001',
                created_at: new Date().toISOString()
            },
            {
                name: 'Amit Patel',
                phone: '+919876543212',
                email: 'amit@example.com',
                address: '789 Ring Road, Ahmedabad, Gujarat 380001',
                created_at: new Date().toISOString()
            }
        ];

        // Sample Products
        const sampleProducts = [
            {
                name: 'Rice (1kg)',
                sku: 'RICE001',
                price: 50.00,
                stock: 100,
                category: 'Groceries',
                tax: 5,
                created_at: new Date().toISOString()
            },
            {
                name: 'Cooking Oil (1L)',
                sku: 'OIL001',
                price: 120.00,
                stock: 50,
                category: 'Groceries',
                tax: 5,
                created_at: new Date().toISOString()
            },
            {
                name: 'Sugar (1kg)',
                sku: 'SUG001',
                price: 45.00,
                stock: 75,
                category: 'Groceries',
                tax: 5,
                created_at: new Date().toISOString()
            },
            {
                name: 'Tea Powder (250g)',
                sku: 'TEA001',
                price: 150.00,
                stock: 40,
                category: 'Groceries',
                tax: 12,
                created_at: new Date().toISOString()
            },
            {
                name: 'Biscuits Pack',
                sku: 'BIS001',
                price: 35.00,
                stock: 200,
                category: 'Snacks',
                tax: 12,
                created_at: new Date().toISOString()
            },
            {
                name: 'Notebook (200 pages)',
                sku: 'NOTE001',
                price: 60.00,
                stock: 150,
                category: 'Stationery',
                tax: 18,
                created_at: new Date().toISOString()
            },
            {
                name: 'Pen (Blue)',
                sku: 'PEN001',
                price: 10.00,
                stock: 500,
                category: 'Stationery',
                tax: 18,
                created_at: new Date().toISOString()
            },
            {
                name: 'Detergent (1kg)',
                sku: 'DET001',
                price: 180.00,
                stock: 30,
                category: 'Household',
                tax: 18,
                created_at: new Date().toISOString()
            }
        ];

        // Add customers
        for (const customer of sampleCustomers) {
            await addRecord('customers', customer);
        }

        // Add products
        for (const product of sampleProducts) {
            await addRecord('products', product);
        }

        alert('Sample data added successfully!\n\n3 Customers and 8 Products have been added.\n\nYou can now create invoices with these sample items.');
        
        // Refresh current page
        await loadPageData(currentPage);
        await loadCustomerDropdown();
        await loadProductDropdowns();

    } catch (error) {
        console.error('Error adding sample data:', error);
        alert('Error adding sample data. Please check console.');
    }
}

// Quick Start Helper
function showQuickStart() {
    const hasCustomers = getAllRecords('customers').then(c => c.length > 0);
    const hasProducts = getAllRecords('products').then(p => p.length > 0);
    
    Promise.all([hasCustomers, hasProducts]).then(([customers, products]) => {
        if (!customers || !products) {
            if (confirm('Welcome to Retail Billing System!\n\nWould you like to add sample data to get started quickly?\n\nThis will add:\n• 3 Sample Customers\n• 8 Sample Products\n\nYou can delete or modify them later.')) {
                addSampleData();
            }
        }
    });
}

// Call on first load
setTimeout(showQuickStart, 2000);