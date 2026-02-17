# 🏪 Retail Billing System

A complete offline-capable web-based billing software for retail businesses with WhatsApp integration, customer management, inventory tracking, and comprehensive reporting.

## ✨ Features

### Core Features
- ✅ **Offline First**: Works completely offline using IndexedDB
- 📱 **WhatsApp Integration**: Send payment reminders and invoices via WhatsApp
- 📄 **Invoice Management**: Create, edit, print professional invoices
- 👥 **Customer Management**: Track customer history and outstanding payments
- 📦 **Product/Inventory**: Manage products with SKU, pricing, and stock levels
- 💰 **Expense Tracking**: Record and categorize business expenses
- 📊 **Reports & Analytics**: Sales reports, expense analysis, profit calculations
- 🔄 **MySQL Sync**: Optional cloud sync with MySQL database
- 🖨️ **Professional Printing**: Print-ready invoice templates

### Additional Features
- Payment status tracking (Paid/Pending/Partial)
- Due date management with automatic reminders
- Tax calculations (GST/VAT support)
- Customer purchase history
- Category-wise expense breakdown
- Date range reports
- Dashboard with key metrics
- Search functionality across all modules

## 🚀 Quick Start

### Installation

1. **Download/Copy all files** to your web server directory:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `database.js`
   - `api.php` (optional, for MySQL sync)
   - `database.sql` (optional, for MySQL setup)

2. **Open in Browser**:
   - Simply open `index.html` in any modern web browser
   - No server required for offline mode!

### For MySQL Integration (Optional)

1. **Create Database**:
   ```bash
   mysql -u root -p < database.sql
   ```

2. **Configure Database Connection**:
   Edit `api.php` and update these lines:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_USER', 'your_username');
   define('DB_PASS', 'your_password');
   define('DB_NAME', 'retail_billing');
   ```

3. **Place on Web Server**:
   - Copy all files to your web server (Apache/Nginx with PHP)
   - Ensure PHP MySQL extension is enabled

4. **Test API**:
   ```
   http://your-domain.com/api.php?action=export
   ```

## 📖 How to Use

### Initial Setup

1. **Configure Business Settings**:
   - Go to Settings page (⚙️)
   - Enter your business name, address, phone, email
   - Add GST number if applicable
   - Configure WhatsApp reminder settings

### Managing Customers

1. Navigate to **Customers** page
2. Click **"+ Add Customer"**
3. Enter customer details (Name, Phone, Email, Address)
4. Phone number required for WhatsApp integration
5. View customer purchase history and send reminders

### Managing Products

1. Navigate to **Products** page
2. Click **"+ Add Product"**
3. Enter product details:
   - Name, SKU/Code
   - Price, Stock quantity
   - Category, Tax percentage
4. Products are auto-populated in invoice creation

### Creating Invoices

1. Navigate to **"New Invoice"** page
2. Select customer (or add new)
3. Set invoice date and due date
4. Add items:
   - Select product (auto-fills price and tax)
   - Enter quantity
   - Adjust price/tax if needed
5. Review totals (subtotal, tax, grand total)
6. Set payment status (Paid/Pending/Partial)
7. Enter amount paid (for partial payments)
8. Add notes if needed
9. Click **"Save Invoice"**

### Printing Invoices

1. Go to **Invoices** page
2. Click **"Print"** button on any invoice
3. Invoice opens in new window
4. Use browser print (Ctrl+P) to print or save as PDF

### WhatsApp Integration

#### Send Payment Reminders:
1. Dashboard shows pending payments
2. Click **"Send Reminder"** button
3. WhatsApp opens with pre-filled message
4. Review and send message

#### Send Invoice to Customer:
1. Go to **Invoices** page
2. Click **"WhatsApp"** button
3. WhatsApp opens with invoice details
4. Send to customer

### Tracking Expenses

1. Navigate to **Expenses** page
2. Click **"+ Add Expense"**
3. Select date and category
4. Enter description and amount
5. View total expenses by month

### Generating Reports

1. Navigate to **Reports** page
2. Select date range (From - To)
3. Click **"Generate Report"**
4. View:
   - Sales summary
   - Payment status
   - Expense breakdown by category
   - Net profit/loss

## 🗄️ Data Storage

### Offline Mode (Default)
- Uses **IndexedDB** (browser's local database)
- Data persists even after browser restart
- No internet required
- Data stored locally on your device

### MySQL Sync Mode
- Sync offline data to cloud database
- Access from multiple devices
- Backup and restore capabilities
- Click sync button (🔄) to upload data

## 📱 WhatsApp Setup

### Requirements:
- Customer must have valid phone number
- Phone format: Include country code
  - India: +91XXXXXXXXXX
  - US: +1XXXXXXXXXX
  - UK: +44XXXXXXXXXX

### Customizing Messages:
1. Go to Settings
2. Edit "Default Reminder Message"
3. Use placeholders:
   - `{customer_name}` - Customer's name
   - `{amount}` - Pending amount
   - `{invoice_number}` - Invoice number
   - `{due_date}` - Payment due date
   - `{business_name}` - Your business name

## 🔄 Sync with MySQL

### Export Data:
- Data automatically synced when online
- Manual sync: Click sync button (🔄)

### Import Data:
- Useful when switching devices
- Data automatically loaded from MySQL

### Backup Strategy:
1. Regular MySQL database backups
2. Export data as JSON (via API)
3. Keep offline copy on device

## 🖨️ Printing Tips

### For Best Results:
- Use Chrome/Edge for printing
- Select "Save as PDF" for digital copies
- Adjust margins in print settings
- Use portrait orientation
- Include business logo in settings

## 📊 Dashboard Metrics

- **Today's Sales**: Total sales for current day
- **This Month**: Total sales for current month
- **Pending Payments**: Outstanding amount from all customers
- **Total Customers**: Number of registered customers
- **Recent Invoices**: Last 5 invoices created
- **Payment Reminders**: Overdue/upcoming due payments

## 🔒 Security Notes

### Local Storage:
- IndexedDB is secure and private
- Data stays on your device
- Clear browser data will delete records
- Regular backups recommended

### MySQL Storage:
- Use strong database passwords
- Enable SSL for MySQL connections
- Restrict API access with authentication
- Regular database backups

## 🌐 Browser Compatibility

**Fully Supported:**
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+
- Opera 47+

**Features Required:**
- IndexedDB support
- ES6 JavaScript
- CSS Grid/Flexbox

## 📱 Mobile Responsive

- Optimized for mobile devices
- Touch-friendly interface
- Responsive tables and forms
- Works on tablets and phones

## 🛠️ Customization

### Change Colors:
Edit `styles.css` - Update CSS variables:
```css
:root {
    --primary-color: #2563eb;  /* Main theme color */
    --success-color: #10b981;  /* Success actions */
    --danger-color: #ef4444;   /* Delete/warning */
}
```

### Modify Invoice Template:
Edit `app.js` - Function `printInvoiceById()` to customize invoice layout

### Add Currency:
Find all instances of `₹` and replace with your currency symbol

## 🐛 Troubleshooting

### Issue: Data not saving
- **Solution**: Check browser IndexedDB support
- Clear browser cache and retry
- Check browser console for errors

### Issue: WhatsApp not opening
- **Solution**: Verify phone number format (+country code)
- Ensure WhatsApp is installed on device
- Check browser pop-up blocker

### Issue: Print not working
- **Solution**: Allow pop-ups for the site
- Try different browser
- Check printer settings

### Issue: MySQL sync failing
- **Solution**: Verify database credentials in `api.php`
- Check MySQL service is running
- Verify PHP MySQL extension enabled
- Check CORS headers

## 📈 Backup & Restore

### Manual Backup:
1. Open browser console (F12)
2. Run:
   ```javascript
   exportAllData().then(data => {
       console.log(JSON.stringify(data));
   });
   ```
3. Copy and save JSON output

### Restore from Backup:
1. Paste JSON data to variable
2. Run:
   ```javascript
   importAllData(yourDataObject);
   ```

## 🚀 Deployment

### Local Network (LAN):
1. Install XAMPP/WAMP
2. Place files in `htdocs` folder
3. Access via `http://localhost/retail-billing-system`
4. Other devices: `http://your-ip/retail-billing-system`

### Cloud Hosting:
1. Upload files to web hosting (cPanel/FTP)
2. Import `database.sql` to MySQL
3. Configure `api.php` with database credentials
4. Access via your domain

### Portable Version:
- Copy entire folder to USB drive
- Open `index.html` directly
- Works without installation

## 📄 File Structure

```
retail-billing-system/
├── index.html          # Main application file
├── styles.css          # Styling and themes
├── app.js             # Application logic
├── database.js        # IndexedDB operations
├── api.php            # MySQL sync API (optional)
├── database.sql       # MySQL schema (optional)
└── README.md          # Documentation
```

## 💡 Pro Tips

1. **Regular Backups**: Export data weekly
2. **Customer Phone**: Always add phone numbers for WhatsApp
3. **Product Tax**: Set default tax rates in products
4. **Due Dates**: Set realistic payment terms
5. **Reports**: Generate monthly reports for accounting
6. **Stock**: Update product stock after each sale
7. **Categories**: Use consistent expense categories
8. **Notes**: Add payment instructions in invoice notes

## 🤝 Support

For issues or questions:
- Check troubleshooting section
- Review browser console for errors
- Ensure all files are properly uploaded
- Verify database connections

## 📝 License

Free to use for personal and commercial purposes.
Modify as needed for your business requirements.

## 🎯 Future Enhancements

Possible additions:
- Barcode scanning
- Multi-user support
- Advanced inventory management
- Payment gateway integration
- SMS notifications
- Email invoicing
- Batch operations
- Advanced analytics

---

**Made with ❤️ for Retail Business Owners**

Start managing your retail business efficiently today! 🚀