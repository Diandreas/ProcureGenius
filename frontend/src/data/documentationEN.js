/**
 * English Documentation Articles for ProcureGenius
 *
 * This file contains the English version of documentation articles.
 * Articles are organized by category and include full-text search capabilities.
 */

// Documentation categories with English labels
export const documentationCategories = [
  { id: 'getting-started', name: 'Getting Started', icon: '🚀', color: '#3b82f6' },
  { id: 'suppliers', name: 'Suppliers', icon: '🏢', color: '#10b981' },
  { id: 'purchase-orders', name: 'Purchase Orders', icon: '📦', color: '#f59e0b' },
  { id: 'invoices', name: 'Invoices', icon: '💰', color: '#8b5cf6' },
  { id: 'products', name: 'Products', icon: '📦', color: '#14b8a6' },
  { id: 'clients', name: 'Clients', icon: '👥', color: '#06b6d4' },
  { id: 'settings', name: 'Settings', icon: '⚙️', color: '#64748b' },
  { id: 'tips', name: 'Tips & Tricks', icon: '💡', color: '#f97316' },
];

// English documentation articles
export const documentationArticles = [
  // GETTING STARTED
  {
    id: 'getting-started-intro',
    category: 'getting-started',
    title: 'Welcome to ProcureGenius',
    content: `
# Welcome to ProcureGenius

Welcome to your new procurement management platform!

ProcureGenius helps you manage all aspects of your purchases, invoicing, and supplier relationships in one centralized location.

## What is ProcureGenius?

ProcureGenius is a complete procurement management solution that allows you to:

- **Manage your suppliers** with complete contact information
- **Create and track purchase orders** with real-time status
- **Generate and send professional invoices** in PDF
- **Manage your product catalog** with stock tracking
- **Analyze your performance** with interactive dashboards
- **Use AI** to automate repetitive tasks

## Why use ProcureGenius?

### Time savings
- Quick invoice generation with pre-filled templates
- Automated sending via email with attached PDF
- Intelligent search with AI assistant

### Better organization
- Centralize all your procurement data
- Track purchase order status
- Manage payment deadlines

### Professional documents
- Modern PDF templates
- Customization with your logo and colors
- Multi-currency management

## Getting Started

### 1. Configure your company
Start by entering your company information in **Settings > Company**:
- Company name
- Logo
- Address and contact details
- Default currency

### 2. Activate modules
Enable the modules you need in **Settings > Company > Modules**:
- Suppliers
- Purchase Orders
- Invoices
- Products
- Clients

### 3. Create your first records
- Add a supplier
- Add some products
- Create your first purchase order or invoice

### 4. Explore the interface

#### Left side menu
Access different modules from the left menu:

- **Dashboard**: Overview of your activity
- **Suppliers**: Supplier management
- **Purchase Orders**: Order creation and tracking
- **Invoices**: Invoice management
- **Products**: Product catalog
- **Clients**: Client management
- **AI Assistant**: Your intelligent assistant

#### Top toolbar

##### "New" Button
Quickly create a new item in the active module.

##### Light/Dark Theme
Switch between light and dark mode for optimal viewing comfort.

##### AI Assistant
Access your intelligent assistant to:
- Ask questions
- Search for information
- Analyze documents
- Automate tasks

## Need Help?

- Use the **search** at the top of this page
- Browse articles by **category** on the left
- Consult the **FAQ** for quick answers
- Contact **support** if you're stuck
`,
    keywords: ['introduction', 'getting started', 'welcome', 'overview', 'first steps'],
    relatedTopics: ['settings-company', 'settings-profile'],
  },
  {
    id: 'getting-started-navigation',
    category: 'getting-started',
    title: 'Navigating the Interface',
    content: `
# Navigating the Interface

## Main Menu

The left sidebar menu allows you to access different modules:

- **Dashboard**: Overview of your activity
- **Suppliers**: Supplier management
- **Purchase Orders**: Order creation and tracking
- **Invoices**: Invoice management
- **Products**: Product catalog
- **Clients**: Client management
- **AI Assistant**: Your intelligent assistant

## Top Toolbar

### "New" Button
Quickly create a new item in the active module.

### Light/Dark Theme
Switch between light and dark modes according to your preferences.

### Notifications
Receive alerts about important events.

### Help and Tutorial
Access the interactive tutorial, documentation, and support.

### User Menu
Manage your profile and log out.

## Mobile Navigation

On mobile, use the bottom navigation bar to quickly access main modules.
`,
    keywords: ['navigation', 'menu', 'interface', 'toolbar'],
    relatedTopics: ['getting-started-intro', 'shortcuts-navigation'],
  },
  {
    id: 'getting-started-dashboard',
    category: 'getting-started',
    title: 'Using the Dashboard',
    content: `
# Using the Dashboard

The dashboard provides an overview of your activity.

## Available Widgets

### Statistics Widgets
- Total number of suppliers
- Purchase orders in progress
- Invoices to process
- Products in catalog

### Analytics Charts
- Purchase trends
- Distribution by supplier
- Expense trends

### Quick Lists
- Latest purchase orders
- Pending invoices
- Actions to take

## Customization

You can customize your dashboard:

1. Click **"Customize Dashboard"**
2. Drag and drop widgets to reorganize them
3. Add or remove widgets according to your needs
4. Adjust the display period

## Display Periods

Change the period to view your data for:
- Today
- This week
- This month
- This quarter
- This year
- Custom period
`,
    keywords: ['dashboard', 'widgets', 'statistics', 'customization'],
    relatedTopics: ['getting-started-intro'],
  },

  // SUPPLIERS
  {
    id: 'suppliers-create',
    category: 'suppliers',
    title: 'Create a Supplier',
    content: `
# Create a Supplier

## Creation Steps

1. **Access the Suppliers Module**
   - Click on "Suppliers" in the main menu

2. **Create a New Supplier**
   - Click the "New" or "New Supplier" button

3. **Fill in the Information**

### General Information (required)
- **Name**: Supplier's company name
- **Supplier Code**: Unique reference (automatically generated if empty)
- **Email**: Primary contact email
- **Phone**: Phone number

### Address
- Complete address
- City
- Postal code
- Country

### Financial Information
- **Payment Terms**: Payment period (e.g., 30 days)
- **Currency**: Default currency
- **VAT**: Intra-community VAT number

### Contacts
Add contact persons at the supplier:
- First and last name
- Position
- Email
- Phone

4. **Save**
   - Click "Save" to create the supplier

## Tips

- Use consistent supplier codes (e.g., SUPP-001, SUPP-002)
- Add all relevant contacts
- Fill in payment terms to facilitate invoice management
`,
    keywords: ['create supplier', 'new supplier', 'add supplier'],
    relatedTopics: ['suppliers-manage', 'suppliers-contacts'],
  },
  {
    id: 'suppliers-manage',
    category: 'suppliers',
    title: 'Manage Suppliers',
    content: `
# Manage Suppliers

## Supplier List

The list page displays all your suppliers with:
- Name and code
- Status (active/inactive)
- Primary contact
- Number of orders
- Total purchase amount

### Filters and Search
- **Search**: Search by name, code, or email
- **Status**: Filter by active/inactive
- **Sort**: Sort by name, creation date, amount

## Supplier Profile

Click on a supplier to see:

### Information Tab
- Complete contact details
- Financial information
- List of contacts

### History Tab
- All purchase orders
- All invoices
- Purchase statistics

### Documents Tab
- Attached documents
- Contracts
- Certifications

### Notes Tab
- Internal notes
- Communication history

## Quick Actions

From the supplier profile:
- **Create a Purchase Order**
- **Create an Invoice**
- **Edit Information**
- **Deactivate/Activate**
- **Delete** (if no transactions)
`,
    keywords: ['manage suppliers', 'supplier list', 'supplier profile'],
    relatedTopics: ['suppliers-create', 'purchase-orders-create'],
  },
  {
    id: 'suppliers-contacts',
    category: 'suppliers',
    title: 'Manage Supplier Contacts',
    content: `
# Manage Supplier Contacts

## Add a Contact

1. Open the supplier profile
2. Go to the "Contacts" section
3. Click "Add Contact"
4. Fill in the information:
   - First and last name
   - Position/Title
   - Professional email
   - Direct phone
   - Mobile (optional)
   - Notes (optional)

## Set a Primary Contact

The primary contact is used by default for:
- Communications
- Purchase orders
- Invoices

To set a primary contact:
1. Click the star next to the contact
2. The contact becomes the primary contact

## Edit a Contact

1. Click on the contact to edit
2. Modify the information
3. Save the changes

## Delete a Contact

1. Click the delete icon
2. Confirm the deletion

**Note**: You cannot delete the last contact of a supplier.
`,
    keywords: ['contacts', 'supplier contact', 'primary contact'],
    relatedTopics: ['suppliers-create', 'suppliers-manage'],
  },

  // PURCHASE ORDERS
  {
    id: 'purchase-orders-create',
    category: 'purchase-orders',
    title: 'Create a Purchase Order',
    content: `
# Create a Purchase Order

## Creation Steps

1. **Access the Purchase Orders Module**
   - Main menu > Purchase Orders

2. **New Purchase Order**
   - Click "New" or "New Purchase Order"

3. **Select the Supplier**
   - Search and select the supplier
   - Supplier information auto-fills

4. **General Information**
   - **Number**: Automatically generated (editable)
   - **Date**: Purchase order date
   - **Expected Delivery Date**: Planned receipt date
   - **Supplier Reference**: Quote or supplier order reference

5. **Add Products**

### From Catalog
- Click "Add Product"
- Select the product
- Specify the quantity
- Price auto-fills (editable)

### Custom Product
- Enter the description directly
- Specify the unit price
- Enter the quantity

6. **Terms and Notes**
   - Payment terms
   - Delivery terms
   - Internal notes
   - Notes for the supplier

7. **Validate**
   - Click "Save" to create draft
   - Click "Save and Send" to validate and send

## Purchase Order Statuses

- **Draft**: Being created
- **Sent**: Sent to supplier
- **Confirmed**: Confirmed by supplier
- **Partially Received**: Partial receipt
- **Received**: Complete delivery
- **Cancelled**: Order cancelled
`,
    keywords: ['create purchase order', 'new purchase order', 'PO'],
    relatedTopics: ['purchase-orders-manage', 'products-add'],
  },
  {
    id: 'purchase-orders-manage',
    category: 'purchase-orders',
    title: 'Manage Purchase Orders',
    content: `
# Manage Purchase Orders

## Purchase Order List

View all your purchase orders with:
- Number and date
- Supplier
- Total amount
- Status
- Expected delivery date

### Available Filters
- **Status**: Draft, Sent, Received, etc.
- **Supplier**: Filter by supplier
- **Period**: By creation or delivery date
- **Amount**: Amount range

### Search
Search by:
- Order number
- Supplier name
- Supplier reference

## Purchase Order Details

Click on a purchase order to see:

### General Information
- Supplier details
- Dates and references
- Current status

### Product List
- Description
- Quantity ordered / received
- Unit price
- Total

### History
- Creation
- Sending
- Confirmations
- Receipts
- Modifications

## Possible Actions

### On a Draft
- Edit
- Send to supplier
- Delete

### On a Sent Order
- Mark as confirmed
- Record partial receipt
- Record complete receipt
- Create invoice
- Cancel

### On a Received Order
- Create invoice
- View related invoices
- Export to PDF
`,
    keywords: ['manage purchase orders', 'order tracking', 'receipt'],
    relatedTopics: ['purchase-orders-create', 'invoices-create'],
  },
  {
    id: 'purchase-orders-receive',
    category: 'purchase-orders',
    title: 'Receive an Order',
    content: `
# Receive an Order

## Complete Receipt

For receipt of all products:

1. Open the purchase order
2. Click "Receive"
3. Check quantities
4. Add a receipt note (optional)
5. Validate

Status automatically changes to "Received".

## Partial Receipt

For receipt of some products:

1. Open the purchase order
2. Click "Partial Receipt"
3. For each product:
   - Specify the quantity received
   - Note any issues
4. Validate

Status becomes "Partially Received".
You can make multiple partial receipts until complete.

## Discrepancy Management

In case of difference between ordered and received:

### Different Quantity
- Indicate the quantity actually received
- Note the reason for the discrepancy
- Decide if you want to:
  - Wait for the remainder
  - Cancel the rest
  - Create a new order

### Damaged Product
- Mark the product as "damaged"
- Specify the affected quantity
- Add photos if necessary
- Contact the supplier

### Missing Product
- Do not mark the product as received
- Contact the supplier
- System will remind you of pending products

## Receipt History

View receipt history in the "History" tab:
- Date of each receipt
- Quantities received
- Notes and comments
- User who performed the receipt
`,
    keywords: ['receipt', 'delivery', 'receive order', 'partial receipt'],
    relatedTopics: ['purchase-orders-manage', 'purchase-orders-create'],
  },

  // INVOICES
  {
    id: 'invoices-create',
    category: 'invoices',
    title: 'Create an Invoice',
    content: `
# Create an Invoice

## Creation from a Purchase Order

This is the recommended method:

1. Open the received purchase order
2. Click "Create Invoice"
3. Information auto-fills:
   - Supplier
   - Products and quantities
   - Prices

4. Complete:
   - Supplier invoice number
   - Invoice date
   - Due date

5. Save

## Manual Creation

For an invoice without a purchase order:

1. Menu > Invoices > New
2. Select the supplier
3. Fill in the information:
   - Invoice number
   - Invoice date
   - Due date

4. Add invoice lines:
   - Description
   - Quantity
   - Unit price
   - VAT

5. Check the total
6. Save

## Attach the Document

To add the invoice PDF:

1. In the invoice, "Documents" section
2. Click "Add Document"
3. Select the PDF file
4. The document is attached to the invoice

## Automatic Import

Use the AI assistant to automatically import invoices:

1. Menu > AI Assistant
2. Drag and drop the invoice PDF
3. AI extracts the information
4. Verify and validate
5. The invoice is created automatically
`,
    keywords: ['create invoice', 'new invoice', 'invoice'],
    relatedTopics: ['invoices-manage', 'purchase-orders-manage'],
  },
  {
    id: 'invoices-manage',
    category: 'invoices',
    title: 'Manage Invoices',
    content: `
# Manage Invoices

## Invoice List

View all your invoices with:
- Invoice number
- Supplier
- Invoice date
- Due date
- Total amount incl. tax
- Payment status

### Filters
- **Status**: To Pay, Paid, Overdue, Cancelled
- **Supplier**: By supplier
- **Period**: By invoice or due date
- **Amount**: Amount range

### Calendar View
Switch to calendar view to see:
- Invoices due
- Payment delays
- Cash flow planning

## Invoice Details

### Main Information
- Supplier contact details
- Number and dates
- Purchase order reference (if applicable)

### Invoice Lines
- Description
- Quantity
- Unit price excl. tax
- VAT
- Total incl. tax

### Documents
- Invoice PDF
- Other attached documents

### Payments
- Payment history
- Remaining amount to pay

## Invoice Actions

### Record a Payment
1. Open the invoice
2. Click "Record Payment"
3. Specify:
   - Payment date
   - Amount paid
   - Payment method
   - Reference (check number, transfer, etc.)
4. Validate

### Partial Payment
You can record multiple partial payments.
The remaining balance is calculated automatically.

### Cancel an Invoice
1. Open the invoice
2. Click "Cancel"
3. Indicate the reason
4. Confirm

### Export
- **PDF**: Generate invoice PDF
- **Excel**: Export to Excel for analysis
`,
    keywords: ['manage invoices', 'invoice payment', 'invoice list'],
    relatedTopics: ['invoices-create', 'invoices-payment'],
  },
  {
    id: 'invoices-payment',
    category: 'invoices',
    title: 'Payment Tracking',
    content: `
# Payment Tracking

## Tracking Dashboard

The payment dashboard displays:
- Invoices to pay this month
- Overdue invoices
- Total to pay
- Cash flow forecasts

## Record a Payment

### Simple Payment
1. From the invoice list, click "Pay"
2. Or open the invoice and click "Record Payment"
3. Fill in:
   - Payment date
   - Amount (pre-filled with balance)
   - Payment method:
     * Wire transfer
     * Check
     * Credit card
     * Cash
     * Other
   - Transaction reference
4. Validate

### Payment in Installments
To pay an invoice in multiple payments:
1. Record the first partial payment
2. Invoice remains in "Partially Paid" status
3. Record subsequent payments
4. When total is reached, status changes to "Paid"

## Late Payment Management

### Overdue Invoices
Unpaid invoices after their due date appear in red.

### Reminders
To remind a supplier (credit note):
1. Open the invoice
2. Click "Send Reminder"
3. An email is generated with details
4. Modify if necessary
5. Send

### Reminder History
View all reminders sent in the "History" tab.

## Payment Reports

Generate reports:
- Payment status by period
- Payments by supplier
- Cash flow forecasts
- Payment history

To generate a report:
1. Menu > Invoices > Reports
2. Choose report type
3. Select period
4. Export to PDF or Excel
`,
    keywords: ['payment', 'pay invoice', 'reminder', 'late payment'],
    relatedTopics: ['invoices-manage', 'invoices-create'],
  },

  // CLIENTS
  {
    id: 'clients-create',
    category: 'clients',
    title: 'Create a Client',
    content: `
# Create a Client

## Creation Steps

1. **Access the Clients Module**
   - Main menu > Clients

2. **New Client**
   - Click "New" or "New Client"

3. **Basic Information**
   - **Name/Company Name**: Client or company name
   - **Client Code**: Unique reference (auto-generated if empty)
   - **Type**: Company or Individual
   - **Email**: Contact email
   - **Phone**: Main number

4. **Address**
   - Complete address
   - Postal code and city
   - Country

5. **Business Information**
   - Default payment terms
   - Usual discount (%)
   - Currency
   - Sales representative

6. **Tax Information**
   - VAT number
   - SIRET/SIREN number (France)
   - VAT regime

7. **Contacts**
   Add contact persons:
   - Name and position
   - Email and phone
   - Primary contact

8. **Notes**
   - Internal notes
   - Client preferences
   - Relationship history

9. **Save**
   - Click "Save"

## Quick Creation

For quick creation from an invoice form:
1. In the "Client" field, type the name
2. Click "Create New Client"
3. Fill in essential information
4. Client is created and automatically selected
`,
    keywords: ['create client', 'new client', 'add client'],
    relatedTopics: ['clients-manage', 'invoices-create'],
  },
  {
    id: 'clients-manage',
    category: 'clients',
    title: 'Manage Clients',
    content: `
# Manage Clients

## Client List

The list displays all your clients with:
- Name and client code
- Type (Company/Individual)
- Primary contact
- Total revenue
- Last order

### Filters and Search
- **Search**: By name, code, email
- **Type**: Company or Individual
- **Status**: Active or Inactive
- **Sort**: By name, revenue, date

### Bulk Actions
Select multiple clients to:
- Export to Excel
- Send group email
- Bulk modify

## Client Profile

Click on a client to access their complete profile.

### Overview Tab
- General information
- Key statistics
- Recent activities

### Invoices Tab
- All client invoices
- Pending invoices
- Payment history
- Billing statistics

### Contacts Tab
- Contact list
- Communication history
- Contact preferences

### Documents Tab
- Quotes
- Contracts
- Legal documents
- Correspondence

### Notes Tab
- Internal notes
- Interaction history
- Reminders and tasks

## Quick Actions

From the client profile:
- **Create Invoice**
- **Create Quote**
- **Send Email**
- **Schedule Task**
- **Edit Information**
- **View Annual Revenue**

## Client Segmentation

Create segments to better manage your clients:
- VIP clients (> €100,000 revenue)
- Regular clients
- New clients
- Inactive clients

To create a segment:
1. Clients menu > Segments
2. Define criteria
3. Save the segment
4. Use it for reporting or bulk actions
`,
    keywords: ['manage clients', 'client profile', 'client list'],
    relatedTopics: ['clients-create', 'invoices-create'],
  },

  // PRODUCTS
  {
    id: 'products-create',
    category: 'products',
    title: 'Create a Product',
    content: `
# Create a Product

## Product Creation

1. **Access the Catalog**
   - Menu > Products

2. **New Product**
   - Click "New Product"

3. **Basic Information**
   - **Name**: Product name
   - **Reference/SKU**: Unique reference
   - **Barcode**: EAN/UPC (optional)
   - **Short Description**: Summary
   - **Detailed Description**: Complete description

4. **Classification**
   - **Category**: Main category
   - **Subcategory**: Specification (optional)
   - **Tags**: Keywords for search
   - **Type**: Product, Service, Subscription

5. **Pricing and Costs**
   - **Purchase Price**: Purchase cost
   - **Sale Price**: Sale price excl. tax
   - **Margin**: Automatically calculated
   - **VAT**: Applicable VAT rate

6. **Stock** (if physical product)
   - **Manage Stock**: Yes/No
   - **Quantity in Stock**: Current stock
   - **Minimum Stock**: Alert threshold
   - **Unit**: Piece, Kg, L, m², etc.

7. **Suppliers**
   - Add suppliers for this product
   - Purchase price per supplier
   - Supplier reference
   - Delivery time

8. **Images**
   - Main image
   - Secondary images
   - Accepted formats: JPG, PNG

9. **Save**

## Quick Creation

When creating a purchase order, you can quickly create a product:
1. In the product list, click "New Product"
2. Fill in essential fields
3. Product is added to catalog and your order
`,
    keywords: ['create product', 'new product', 'catalog'],
    relatedTopics: ['products-manage', 'products-stock'],
  },
  {
    id: 'products-manage',
    category: 'products',
    title: 'Manage Product Catalog',
    content: `
# Manage Product Catalog

## Product List

View all your products with:
- Image
- Reference and name
- Category
- Sale price
- Stock (if managed)
- Status

### List or Grid View
Switch between:
- **List View**: Detailed table
- **Grid View**: Cards with images

### Filters
- **Category**: By category/subcategory
- **Supplier**: Products from a supplier
- **Stock**: In stock, Out of stock, Low stock
- **Status**: Active, Inactive, Archived
- **Price**: Price range

### Search
Search by:
- Product name
- Reference/SKU
- Barcode
- Description
- Tags

## Product Profile

### General Information
- All characteristics
- Images
- Prices and margins

### History
- Purchase history
- Sales history
- Price evolution

### Stock
- Current stock level
- Stock movements
- Stock alerts

### Suppliers
- Supplier list
- Price per supplier
- Last purchase

## Bulk Actions

Select multiple products to:
- Modify prices
- Change category
- Adjust stocks
- Export to Excel
- Archive

## Import/Export

### Import Products
1. Menu > Products > Import
2. Download Excel template
3. Fill in your data
4. Import the file
5. Verify and validate

### Export Catalog
1. Menu > Products > Export
2. Choose format (Excel, CSV, PDF)
3. Select columns
4. Download the file
`,
    keywords: ['manage products', 'catalog', 'product list'],
    relatedTopics: ['products-create', 'products-stock'],
  },
  {
    id: 'products-stock',
    category: 'products',
    title: 'Stock Management',
    content: `
# Stock Management

## Activating Stock Management

For each product, you can:
- Enable or disable stock tracking
- Define minimum stock
- Receive alerts

## Stock Movements

Stocks are automatically updated during:
- **Order Receipt**: Stock +
- **Sale**: Stock -
- **Manual Adjustment**: +/-

### Manually Adjust Stock
1. Open the product profile
2. "Stock" section
3. Click "Adjust"
4. Specify:
   - Movement type (In/Out)
   - Quantity
   - Reason (Inventory, Loss, Donation, etc.)
   - Notes
5. Validate

## Movement History

View complete history:
- Date and time
- Movement type
- Quantity
- Resulting stock
- Reason
- User
- Related document (order, invoice)

## Stock Alerts

### Minimum Stock
Define an alert threshold for each product.
You'll receive a notification when stock falls below this threshold.

### Out of Stock
Out-of-stock products appear:
- In the dashboard (widget)
- In a dedicated report
- With an alert icon

## Inventory

### Perform Inventory
1. Menu > Products > Inventory
2. Create an inventory session
3. For each product:
   - Theoretical stock (in system)
   - Actual stock (counted)
   - Discrepancy
4. Validate inventory
5. Stocks are automatically adjusted

### Partial Inventory
You can perform inventories by:
- Category
- Location
- Product selection

## Stock Reports

Generate reports:
- Stock value
- Movements by period
- Most/least sold products
- Turnover rate
- Products to replenish
`,
    keywords: ['stock', 'inventory', 'stock management', 'out of stock'],
    relatedTopics: ['products-manage', 'purchase-orders-receive'],
  },

  // SETTINGS
  {
    id: 'settings-profile',
    category: 'settings',
    title: 'Configure Your Profile',
    content: `
# Configure Your Profile

## Access Settings

1. Click your avatar in the top right
2. Select "Settings"
3. "Profile" tab

## Personal Information

### Basic Information
- **First and Last Name**
- **Email**: Login email (modifiable only by admin)
- **Phone**
- **Position/Title**
- **Profile Photo**

### Language Preferences
- French (default)
- English
- Spanish

### Theme
- Light
- Dark
- Automatic (follows system)

## Notification Settings

### Email Notifications
Choose to receive emails for:
- New purchase orders
- Invoices to pay
- Stock alerts
- Comments and mentions
- Weekly summary

### In-App Notifications
- Push notifications
- Sounds
- Badges

### Frequency
- Immediate
- Daily summary
- Weekly summary

## Security

### Change Password
1. "Security" section
2. "Change Password"
3. Enter:
   - Current password
   - New password
   - Confirmation
4. Validate

Password requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one digit
- At least one special character

### Two-Factor Authentication (2FA)
1. Enable 2FA
2. Scan QR code with your authentication app
3. Enter verification code
4. Save backup codes

### Active Sessions
View your active sessions:
- Device
- Location
- Last activity
- Revoke suspicious sessions
`,
    keywords: ['profile', 'user settings', 'password', 'notifications'],
    relatedTopics: ['settings-company', 'settings-users'],
  },
  {
    id: 'settings-company',
    category: 'settings',
    title: 'Company Settings',
    content: `
# Company Settings

## Company Information

### Identity
- **Company Name**
- **Legal Form** (LLC, Inc., Corp., etc.)
- **Logo**: For documents (invoices, quotes, etc.)
- **Slogan** (optional)

### Contact Details
- **Headquarters Address**
- **Phone**
- **General Email**
- **Website**

### Legal Information
- **SIRET/SIREN**
- **Intra-community VAT Number**
- **NAF/APE Code**
- **Share Capital**
- **RCS**: Registration city

## Financial Settings

### Primary Currency
- Euro (€)
- Dollar ($)
- Pound Sterling (£)
- Other

### Default VAT Rate
- Standard VAT (20% in France)
- Intermediate VAT (10%)
- Reduced VAT (5.5%)
- Custom

### Payment Terms
- 15 days
- 30 days
- 45 days
- 60 days
- Custom

### Legal Mentions
Texts displayed on documents:
- Invoice mentions
- Terms and conditions
- Confidentiality clause

## Numbering

### Number Formats
Customize numbering format for:
- **Invoices**: E.g., INV-2024-0001
- **Quotes**: E.g., QUO-2024-0001
- **Purchase Orders**: E.g., PO-2024-0001
- **Clients**: E.g., CLI-0001
- **Suppliers**: E.g., SUP-0001

Available variables:
- {YYYY}: Year on 4 digits
- {YY}: Year on 2 digits
- {MM}: Month
- {DD}: Day
- {N}: Incremental number

### Counters
Reset counters if necessary.

## Modules

Enable or disable modules:
- Suppliers
- Purchase Orders
- Invoices
- Products
- Clients

Each module can be enabled/disabled according to your needs and subscription.
`,
    keywords: ['company settings', 'configuration', 'company', 'modules'],
    relatedTopics: ['settings-profile', 'settings-users'],
  },
  {
    id: 'settings-users',
    category: 'settings',
    title: 'User Management',
    content: `
# User Management

## Add a User

1. Settings > Users
2. Click "Invite User"
3. Fill in:
   - User email
   - First and last name
   - Role
4. Send invitation

User receives an email with a link to create their account.

## Roles and Permissions

### Administrator
- Full access
- User management
- Company settings
- All modules

### Manager
- Data management
- Creation and modification
- No access to settings
- Can manage their team

### User
- Consultation
- Limited creation
- No deletion
- Modules according to permissions

### Read Only
- Consultation only
- No modification
- Reports and exports

### Custom
Create a custom role:
1. Settings > Roles
2. Create new role
3. Define permissions per module:
   - Read
   - Create
   - Modify
   - Delete
4. Assign role to users

## Manage Users

### Edit a User
1. User list
2. Click on user
3. Modify information
4. Change role if necessary
5. Save

### Deactivate a User
To temporarily suspend access:
1. Open user profile
2. Click "Deactivate"
3. User can no longer log in
4. Their data remains intact
5. You can reactivate anytime

### Delete a User
⚠️ **Warning**: Deletion is permanent.

To delete:
1. Open user profile
2. Click "Delete"
3. Confirm deletion
4. Data created by user is kept

## Teams

Organize your users into teams:

### Create a Team
1. Settings > Teams
2. Create new team
3. Name the team (e.g., "Purchasing", "Accounting")
4. Add members
5. Define a manager

### Team Permissions
Teams can have:
- Access to specific suppliers only
- Limited purchase budget
- Specific modules
- Group notifications
`,
    keywords: ['users', 'permissions', 'roles', 'teams'],
    relatedTopics: ['settings-profile', 'settings-company'],
  },

  // SMTP EMAIL CONFIGURATION (CRITICAL ARTICLE)
  {
    id: 'settings-email-smtp',
    category: 'settings',
    title: 'SMTP Email Configuration (Gmail, Outlook)',
    content: `
# SMTP Email Configuration for Automatic Sending

For ProcureGenius to send emails (invoices, purchase orders, reminders), you must configure SMTP settings.

## Configuration for Gmail (MOST COMMONLY USED)

Gmail is the most common service but requires specific configuration due to enhanced security.

### Step 1: Enable Two-Step Verification

**REQUIRED** since May 2022, you can no longer use your regular Gmail password.

1. Go to **https://myaccount.google.com/security**
2. "Signing in to Google" section
3. Click on **"2-Step Verification"**
4. Follow the steps to enable 2FA (SMS or app)

### Step 2: Create an App Password

This is the CRITICAL part that many users miss.

1. Once 2FA is enabled, return to **https://myaccount.google.com/security**
2. Look for **"App passwords"** (in "Signing in to Google" section)
3. Select:
   - **App**: "Other (custom name)"
   - **Name**: "ProcureGenius" or "SMTP ProcureGenius"
4. Click **"Generate"**
5. Google displays a 16-character password (e.g., abcd efgh ijkl mnop)
6. **COPY THIS PASSWORD** (you'll never see it again)

### Step 3: Configuration in ProcureGenius

1. **Settings > Company > Email Configuration**
2. Fill in exactly:

**SMTP Server:** smtp.gmail.com

**Port:** 587

**Security:** TLS (or STARTTLS)

**Sender Email:** your.email@gmail.com
(The one you use for Gmail)

**Username:** your.email@gmail.com
(Same as sender email)

**Password:** abcd efgh ijkl mnop
(The 16-character app password, **WITH or WITHOUT spaces**, both work)

3. Click **"Test Configuration"**
4. If successful: ✅ "Test email sent successfully"
5. Click **"Save"**

## Outlook / Office 365 Configuration

### Personal Outlook (outlook.com, hotmail.com, live.com)

**SMTP Server:** smtp-mail.outlook.com

**Port:** 587

**Security:** STARTTLS

**Email + Username:** your.email@outlook.com

**Password:**
- Your regular Outlook password works
- If you have 2FA enabled, create an app password

### Professional Office 365

**SMTP Server:** smtp.office365.com

**Port:** 587

**Security:** STARTTLS

**Email + Username:** your.email@yourcompany.com

**Password:**
- Office 365 password
- Contact your IT administrator if issues occur

## OVH Configuration

**SMTP Server:** ssl0.ovh.net

**Port:** 587 (TLS) or 465 (SSL)

**Email + Username:** your.email@yourdomain.com

**Password:**
- OVH email password

## Common Problems and Solutions

### ❌ "Authentication failed" (Gmail)

**Causes:**
1. Using your Gmail password instead of app password
2. Two-step verification not enabled
3. App password copied incorrectly

**Solution:**
- Redo steps 1 and 2 above
- Create a NEW app password
- Copy it without extra spaces

### ❌ "Connection refused" or "Connection timed out"

**Causes:**
- Incorrect port
- Firewall blocking SMTP port

**Solution:**
- Check port: **587** for Gmail/Outlook
- Verify your firewall allows outgoing connections on port 587
- Try port **465** with SSL instead of TLS

### ❌ "Less secure app access disabled"

**Cause:**
- Not using an app password (Gmail)

**Solution:**
- Do NOT try to enable "Less secure apps" (Google removed this)
- Use an app password (see step 2)

### ❌ Emails go to SPAM

**Causes:**
- Your domain has no SPF/DKIM configuration
- Sending too many emails at once

**Solutions:**
- Use Gmail/Outlook instead of personal server
- Ask recipients to mark your emails as "Not spam"
- Configure your domain's SPF records

## Quick Verification

To test if everything works:

1. Create a test invoice
2. Send it to your own email
3. Verify you receive:
   - The email
   - With PDF attached
   - In your inbox (not spam)

## Sending Limits

### Free Gmail
- **500 emails / day**
- If exceeded: account temporarily blocked (24h)

### Gmail Workspace (paid)
- **2,000 emails / day**

### Personal Outlook
- **300 emails / day**

### Office 365
- **10,000 emails / day**

## Recommendations

### For small business (< 50 invoices/month)
✅ **Free Gmail** is more than enough

### For medium business (> 100 invoices/month)
✅ **Google Workspace** (from €5/month/user)

### For large enterprise
✅ **Office 365** or dedicated SMTP server

## Custom SMTP Server Configuration

If you have your own SMTP server:

1. Ask your host for:
   - SMTP server address
   - Port (587, 465, or 25)
   - Security type (TLS, SSL, or none)

2. Test with an email client (Thunderbird, Outlook) first

3. If it works locally, it'll work in ProcureGenius

## Security

**NEVER SHARE:**
- Your app password
- Your complete SMTP configuration

**Best practices:**
- Change app password every 6 months
- Revoke unused old passwords
- Use a dedicated email for the app (e.g., billing@yourcompany.com)
`,
    keywords: ['email', 'SMTP', 'Gmail', 'Outlook', 'configuration', 'app password', 'send email'],
    relatedTopics: ['invoices-pdf-email', 'settings-company'],
  },

  // INVOICES
  {
    id: 'invoices-pdf-email',
    category: 'invoices',
    title: 'Invoice PDF Generation and Email Sending',
    content: `
# Invoice PDF Generation and Email Sending

ProcureGenius automatically generates professional PDF invoices and sends them via email.

## What IS Possible

### ✅ Automatic PDF Generation

Each invoice can be generated as a professional PDF with:

**4 available templates:**
1. **Classic**: Traditional and sober design
2. **Modern**: Contemporary style with colors
3. **Minimal**: Clean and elegant
4. **Professional**: Advanced corporate format

**Customization:**
- Your company logo
- Your brand colors
- Custom legal mentions
- Terms and conditions

**Automatic elements:**
- Payment QR code (according to configuration)
- Automatic numbering
- Automatic tax calculations (incl./excl. tax)
- Multi-currency (€, $, £, etc.)

### ✅ Email Sending with PDF Attachment

**From the invoice:**
1. Click "Send"
2. PDF is **generated automatically**
3. Pre-filled email with:
   - Recipient (client's email)
   - Custom subject
   - Professional message
   - **Invoice PDF as attachment**
4. Customize the message if needed
5. Send

**Confirmation:**
- Email sent successfully
- Sending date recorded
- Complete sending history

### ✅ Download and Print

**Download:**
- Click "Download PDF"
- PDF downloads instantly
- Format optimized for archiving

**Print:**
- Click "Print"
- PDF opens in a print window
- A4 format optimized

### ✅ Customizable Templates

In **Settings > Invoicing**:
- Choose your default template
- Upload your logo (PNG, JPG)
- Configure your colors (hexadecimal)
- Add your legal mentions
- Real-time preview

## What is NOT Possible

### ❌ External PDF Upload

You **cannot**:
- Upload a scanned PDF from your computer
- Replace the generated PDF with another
- Store external PDFs in invoices

**Why?**
Invoices are dynamically generated from system data to ensure consistency and integrity.

**Alternative:**
- Use AI chat to **extract data** from a scanned PDF
- AI creates the invoice in the system with this data
- A new PDF is then automatically generated

### ❌ PDF Modification After Generation

Once generated, the PDF cannot be:
- Modified directly
- Annotated in the application
- Electronically signed in ProcureGenius

**Alternative:**
- Modify the invoice in the system
- Regenerate a new PDF with the modifications

### ❌ Integrated Electronic Signature

ProcureGenius does not handle:
- Qualified electronic signatures
- Signature validation
- Digital certificates

**Alternative:**
- Download the PDF
- Use an external signature tool (Adobe Sign, DocuSign, etc.)
- Archive the signed PDF separately

## How to Generate and Send an Invoice

### Method 1: Simple Generation

1. Open the invoice
2. Click **"Download PDF"** or **"Print"**
3. PDF is generated on the fly
4. Choose the action (download, print, open)

### Method 2: Email Sending

1. Open the invoice
2. Click **"Send"**
3. Check/modify:
   - Recipient email
   - Message subject
   - Message body
4. Click **"Send Email"**
5. PDF is **automatically attached**

**The client receives:**
- Personalized email
- Professional quality PDF invoice
- Ready to be paid or archived

### Method 3: Batch Sending

To send multiple invoices:
1. Invoice list page
2. Select invoices (checkboxes)
3. Batch actions > **"Send by Email"**
4. Confirm
5. Each invoice is sent individually with its PDF

## Email Configuration

For sending to work, configure your SMTP settings:

1. **Settings > Email**
2. Fill in:
   - SMTP server (e.g., smtp.gmail.com)
   - Port (465 SSL or 587 TLS)
   - Sender email
   - SMTP password
3. Test the configuration
4. Save

**Compatible services:**
- Gmail
- Outlook / Office 365
- OVH
- Infomaniak
- Any standard SMTP server

## Tips

### Test Your Templates
Before sending to a client:
- Generate a test PDF
- Check the rendering (logo, colors, alignment)
- Print a sample

### Customize Your Messages
Create email templates for:
- First invoice for a client
- Recurring invoices
- Payment reminders
- Invoices with discounts

### Automatic Archiving
PDFs are not stored, they are generated on demand.
To archive:
- Download important PDFs
- Save them in your external document management system
`,
    keywords: ['PDF', 'email', 'sending', 'generation', 'template', 'invoice PDF'],
    relatedTopics: ['invoices-manage', 'settings-company'],
  },

  // TIPS & TRICKS - AI
  {
    id: 'tips-ai-document-analysis',
    category: 'tips',
    title: 'Analyzing PDF Documents with AI',
    content: `
# Analyzing PDF Documents with AI

ProcureGenius AI can automatically extract data from your PDF documents, saving you considerable time.

## What You Can Do

### 1. Automatic Extraction from a PDF Invoice

**Upload a supplier invoice to the AI chat**, and the AI instantly extracts:
- Invoice number
- Issue date and due date
- Supplier name
- Supplier address
- Complete list of products/services
- Quantities and unit prices
- Amounts excl. tax, VAT, and incl. tax

**Concrete example:**
1. Drag and drop "Invoice_ACME_2024.pdf" into the AI chat
2. AI analyzes the document in 2-3 seconds
3. It displays all extracted data
4. You can ask: **"Create an invoice in the system with this information"**
5. The invoice is automatically recorded

### 2. Create a Supplier from a PDF

If the supplier doesn't exist yet:

**Ask:** "Extract the supplier info and create it in the system"

**AI will automatically create:**
- The supplier with name, address, email, phone
- All contact information found in the PDF

### 3. Analyze Quotes

Upload multiple quotes from different suppliers:

**Ask:** "Compare these 3 quotes and tell me which is most advantageous"

**AI analyzes:**
- Unit prices for each line
- Payment terms
- Delivery times
- Included/excluded services
- **And gives you a motivated recommendation**

### 4. Extract Data from Delivery Notes

Upload a supplier delivery note:

**Ask:** "Check if the delivery matches our purchase order PO-2024-0042"

**AI will:**
- Extract delivered quantities
- Compare with the original purchase order
- Report any discrepancies
- Suggest updating the receipt

## Usage Tips

### PDF Format
- Prefer **generated** PDFs (not scans)
- For scans, ensure they are **clear and readable**
- AI handles documents in French and English

### Be Explicit
Instead of just uploading the PDF, say what you want to do:
- "Analyze this invoice and create it in the system"
- "Extract the supplier information"
- "Compare this quote with our purchase order"

### Always Verify
AI is very accurate, but always check:
- Critical amounts
- Due dates
- Product references

## Advanced Use Cases

### Batch Processing
Upload 5-10 invoices at once:

"Analyze all these invoices and tell me the total to pay this month"

### Anomaly Detection
"Check if this invoice matches purchase order PO-2024-0123 and report differences"

### History
"Show me all XYZ supplier invoices I imported this month"
`,
    keywords: ['AI', 'PDF', 'extraction', 'documents', 'invoices', 'automatic analysis'],
    relatedTopics: ['invoices-create', 'suppliers-create'],
  },
  {
    id: 'tips-ai-smart-search',
    category: 'tips',
    title: 'Smart Search with AI',
    content: `
# Smart Search with AI

Instead of manually navigating through menus and filters, use the AI chat to find exactly what you're looking for in natural language.

## Why It's Remarkable

### Before (without AI)
1. Go to the Invoices module
2. Click on filters
3. Select "Status: Unpaid"
4. Search for client name
5. Sort by date
6. Browse the list

### With AI
Simply ask: **"Find all unpaid invoices from ABC Corp"**

AI instantly displays relevant results.

## Examples of Powerful Searches

### Invoice Searches

**Relative dates (AI understands temporal context):**
- "Invoices from last week"
- "Invoices issued this month"
- "Invoices due yesterday"
- "Invoices created today"

**By status:**
- "All unpaid invoices"
- "Invoices overdue for more than 30 days"
- "Partially paid invoices"

**By client:**
- "Last invoice from [Client XYZ]"
- "All invoices from [Client] this year"
- "Most recent invoice for ABC Corp"

**Complex combinations:**
- "Unpaid invoices over €1000 from more than 15 days ago"
- "XYZ client invoices issued in November with 20% VAT"

### Product Searches

- "Out of stock products"
- "Office supplies category products with low stock"
- "Products purchased from ACME supplier"
- "Products never sold for 6 months"

### Supplier Searches

- "Suppliers with overdue invoices"
- "Best supplier for office chairs" (AI analyzes prices and history)
- "Suppliers contacted this month"

### Purchase Order Searches

- "Purchase orders pending delivery"
- "Orders placed with [Supplier] this quarter"
- "POs not received for more than 7 days"

## Analytics and Statistics

AI can also perform calculations:

**Financial questions:**
- "How much did I spend at XYZ supplier this month?"
- "What's my total revenue for the quarter?"
- "What's my average invoice per client?"

**Comparisons:**
- "Compare A4 paper prices between my suppliers"
- "Which supplier delivers the fastest?"
- "Who has the best discount rate?"

**Trends:**
- "Are my expenses increasing or decreasing this month?"
- "Which products sell best?"

## Action Commands

AI doesn't just search, it can also **act**:

**Create:**
- "Create a new supplier named ACME Corp"
- "Create an invoice for ABC client for €1500"

**Modify:**
- "Mark invoice INV-2024-0123 as paid"
- "Change PO-2024-0042 status to delivered"

**Export:**
- "Export all unpaid invoices to Excel"
- "Generate a PDF report of December purchases"

## Tips for Better Searches

### Be Natural
No need for special syntax, speak normally:
- "Show me my overdue invoices"
- "What's the last order placed?"

### Use Exact References When You Have Them
- "Invoice INV-2024-0123" (more precise than "an invoice")
- "Client Company LLC" (exact name)

### Ask for Clarification if Needed
If results aren't as expected:
- "No, I only want those from this month"
- "Filter by amount greater than €500"

### Explore
AI understands many variations:
- "What's new today?"
- "What needs my attention?"
- "Summary of my activity this week"
`,
    keywords: ['AI', 'search', 'chat', 'natural language', 'intelligent assistant'],
    relatedTopics: ['tips-ai-document-analysis', 'getting-started-intro'],
  },

  // Add more articles here as needed...
  // The French version has 30+ articles, translate progressively

];

// Search function for English documentation
export const searchDocumentation = (query) => {
  if (!query || query.trim() === '') {
    return [];
  }

  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);

  return documentationArticles
    .map(article => {
      let score = 0;
      const searchableText = `${article.title} ${article.content} ${article.keywords.join(' ')}`.toLowerCase();

      searchTerms.forEach(term => {
        if (article.title.toLowerCase().includes(term)) {
          score += 10;
        }
        if (article.keywords.some(keyword => keyword.toLowerCase().includes(term))) {
          score += 5;
        }
        const contentMatches = (searchableText.match(new RegExp(term, 'g')) || []).length;
        score += contentMatches;
      });

      return { ...article, searchScore: score };
    })
    .filter(article => article.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore);
};

// Get category by ID
export const getCategoryById = (categoryId) => {
  return documentationCategories.find(cat => cat.id === categoryId);
};

// Get article by ID
export const getArticleById = (articleId) => {
  return documentationArticles.find(article => article.id === articleId);
};

// Get related articles
export const getRelatedArticles = (article) => {
  if (!article || !article.relatedTopics) {
    return [];
  }

  return article.relatedTopics
    .map(topicId => documentationArticles.find(a => a.id === topicId))
    .filter(Boolean);
};

// Get articles by category
export const getArticlesByCategory = (categoryId) => {
  return documentationArticles.filter(article => article.category === categoryId);
};
