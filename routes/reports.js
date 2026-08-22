const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const { auth } = require('../middleware/auth');
const { requireFeature } = require('../middleware/featureGate');

router.use(requireFeature('reports'));

// Import all models
const Order = require('../models/Order');
const Dispatch = require('../models/Dispatch');
const ServiceRequest = require('../models/ServiceRequest');
const ServiceCenter = require('../models/ServiceCenter');
const ContentRequest = require('../models/ContentRequest');
const ContentUpload = require('../models/ContentUpload');
const LogisticPartner = require('../models/LogisticPartner');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const User = require('../models/User');
const Retailer = require('../models/Retailer');
const SerialRegistry = require('../models/SerialRegistry');
const StockTransfer = require('../models/StockTransfer');
const SerialValidationHistory = require('../models/SerialValidationHistory');
const ApiKey = require('../models/ApiKey');
const Company = require('../models/Company');

// Multi-tenant query filter helper
function getCompanyFilter(req) {
    const role = String(req.user?.role || '').toLowerCase();
    let companyId = req.user?.companyId;
    if ((role === 'super-admin' || role === 'superadmin') && req.query.companyId) {
        companyId = req.query.companyId;
    } else if ((role === 'super-admin' || role === 'superadmin') && !companyId) {
        return {};
    }
    if (!companyId) return {};
    const compObjectId = mongoose.Types.ObjectId.isValid(companyId) ? new mongoose.Types.ObjectId(companyId) : companyId;
    return { companyId: compObjectId };
}

// Helper function to convert JSON to CSV
function jsonToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add header row
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            // Handle values with commas, quotes, or newlines
            if (value === null || value === undefined) return '';
            const stringValue = String(value).replace(/"/g, '""');
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue}"`;
            }
            return stringValue;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

// Helper function to flatten nested objects for Excel/CSV
function flattenObject(obj, prefix = '') {
    const flattened = {};
    
    for (const key in obj) {
        if (obj[key] === null || obj[key] === undefined) {
            flattened[prefix + key] = '';
        } else if (typeof obj[key] === 'object' && !(obj[key] instanceof Date) && !Array.isArray(obj[key])) {
            Object.assign(flattened, flattenObject(obj[key], `${prefix}${key}.`));
        } else if (Array.isArray(obj[key])) {
            flattened[prefix + key] = obj[key].join('; ');
        } else if (obj[key] instanceof Date) {
            flattened[prefix + key] = obj[key].toISOString();
        } else {
            flattened[prefix + key] = obj[key];
        }
    }
    
    return flattened;
}

// Get Orders Report (Excel)
router.get('/orders', auth, async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        
        let query = { ...getCompanyFilter(req) };
        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (status) query.status = status;
        
        const orders = await Order.find(query).lean();
        
        // Export ONLY essential order data - 27 columns
        const flatOrders = orders.map(order => ({
            'Order Number': order.orderNumber || 'N/A',
            'Order Date': new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            'Retailer Name': order.retailerName || 'N/A',
            'Retailer Email': order.retailerEmail || 'N/A',
            'Retailer Phone': order.retailerPhone || 'N/A',
            'Retailer GST': order.retailerGST || 'N/A',
            'Items Count': order.items?.length || 0,
            'Products': order.items?.map(item => `${item.name} (${item.quantity}x₹${item.price})`).join('; ') || 'N/A',
            'Subtotal': order.subtotal || 0,
            'GST Rate': order.gstRate || 18,
            'GST Amount': order.gstAmount || 0,
            'Total Amount': order.amount || 0,
            'Order Status': order.status || order.orderStatus || 'confirmed',
            'Payment Status': order.paymentStatus || 'pending',
            'Payment Method': order.paymentMethod || 'N/A',
            'Invoice Number': order.invoiceNumber || 'N/A',
            'Invoice PDF Path': order.invoicePdfPath || 'N/A',
            'Invoice Generated': order.invoiceGeneratedAt ? new Date(order.invoiceGeneratedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A',
            'Dispatch Date': order.dispatchDate ? new Date(order.dispatchDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not Dispatched',
            'Delivery Date': order.deliveryDate ? new Date(order.deliveryDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not Delivered',
            'Billing Address': order.billingAddress ? `${order.billingAddress.street || ''}, ${order.billingAddress.city || ''}, ${order.billingAddress.state || ''}, ${order.billingAddress.pincode || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '') : 'N/A',
            'Shipping Address': order.shippingAddress ? `${order.shippingAddress.street || ''}, ${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''}, ${order.shippingAddress.pincode || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '') : 'N/A',
            'Customer Name': order.customer?.name || 'N/A',
            'Customer Email': order.customer?.email || 'N/A',
            'Customer Phone': order.customer?.phone || 'N/A',
            'Notes': order.notes || '',
            'Last Updated': order.updatedAt ? new Date(order.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'
        }));
        
        // Create Excel workbook
        const ws = XLSX.utils.json_to_sheet(flatOrders);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Orders');
        
        // Generate Excel file
        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Disposition', 'attachment; filename=orders_report.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);
        
        console.log('📊 Orders Report Generated:', flatOrders.length, 'records');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Deliveries Report (Excel)
router.get('/deliveries', auth, async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        
        let query = { ...getCompanyFilter(req) };
        if (startDate && endDate) {
            query.dispatchDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (status) query.status = status;
        
        const dispatches = await Dispatch.find(query)
            .populate('logisticPartnerId', 'partnerName partnerCode')
            .lean();
        
        // Only essential delivery fields
        const flatDispatches = dispatches.map(dispatch => ({
            'Tracking Number': dispatch.trackingNumber || 'N/A',
            'Order Number': dispatch.orderNumber || 'N/A',
            'Dispatch Date': dispatch.dispatchDate ? new Date(dispatch.dispatchDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A',
            'Expected Delivery': dispatch.expectedDeliveryDate ? new Date(dispatch.expectedDeliveryDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A',
            'Actual Delivery': dispatch.actualDeliveryDate ? new Date(dispatch.actualDeliveryDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not Delivered',
            'Logistic Partner': dispatch.logisticPartnerId?.partnerName || 'N/A',
            'Partner Code': dispatch.logisticPartnerId?.partnerCode || 'N/A',
            'Customer Name': dispatch.customerName || 'N/A',
            'Customer Phone': dispatch.customerPhone || 'N/A',
            'Delivery Address': dispatch.deliveryAddress || 'N/A',
            'City': dispatch.city || 'N/A',
            'State': dispatch.state || 'N/A',
            'Pincode': dispatch.pincode || 'N/A',
            'Status': dispatch.status || 'pending',
            'Remarks': dispatch.remarks || ''
        }));
        
        // Create Excel workbook
        const ws = XLSX.utils.json_to_sheet(flatDispatches);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Deliveries');
        
        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Disposition', 'attachment; filename=deliveries_report.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);
        
        console.log('📊 Deliveries Report Generated:', flatDispatches.length, 'records');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Services Report (Excel)
router.get('/services', auth, async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        
        let query = { ...getCompanyFilter(req) };
        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (status) query.status = status;
        
        const serviceRequests = await ServiceRequest.find(query)
            .populate('serviceCenterId', 'name location')
            .lean();
        
        // Only essential service request fields
        const flatServices = serviceRequests.map(service => ({
            'Ticket Number': service.ticketNumber || 'N/A',
            'Request Date': new Date(service.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            'Customer Name': service.customerName || 'N/A',
            'Customer Email': service.customerEmail || 'N/A',
            'Customer Phone': service.customerPhone || 'N/A',
            'Product Name': service.productName || 'N/A',
            'Product Model': service.productModel || 'N/A',
            'Issue Type': service.issueType || 'N/A',
            'Issue Description': service.issueDescription || 'N/A',
            'Priority': service.priority || 'normal',
            'Status': service.status || 'pending',
            'Service Center': service.serviceCenterId?.name || 'Not Assigned',
            'Service Center Location': service.serviceCenterId?.location || 'N/A',
            'Assigned Technician': service.assignedTechnician || 'Not Assigned',
            'Scheduled Date': service.scheduledDate ? new Date(service.scheduledDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not Scheduled',
            'Completed Date': service.completedDate ? new Date(service.completedDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not Completed',
            'Resolution': service.resolution || '',
            'Customer Rating': service.customerRating || 'Not Rated',
            'Remarks': service.remarks || ''
        }));
        
        // Create Excel workbook
        const ws = XLSX.utils.json_to_sheet(flatServices);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Service Requests');
        
        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Disposition', 'attachment; filename=services_report.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);
        
        console.log('📊 Services Report Generated:', flatServices.length, 'records');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Service Centers Report (CSV)
router.get('/service-centers', auth, async (req, res) => {
    try {
        const centers = await ServiceCenter.find(getCompanyFilter(req)).lean();
        
        // Only essential service center fields
        const flatCenters = centers.map(center => ({
            'Center Name': center.name || 'N/A',
            'Center Code': center.centerCode || 'N/A',
            'Contact Person': center.contactPerson || 'N/A',
            'Email': center.email || 'N/A',
            'Phone': center.phone || 'N/A',
            'Address': center.address || 'N/A',
            'City': center.city || 'N/A',
            'State': center.state || 'N/A',
            'Pincode': center.pincode || 'N/A',
            'Services Handled': center.servicesHandled || 0,
            'Status': center.isActive ? 'Active' : 'Inactive'
        }));
        const csv = jsonToCSV(flatCenters);
        
        res.setHeader('Content-Disposition', 'attachment; filename=service_centers_report.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csv);
        
        console.log('📊 Service Centers Report Generated:', flatCenters.length, 'records');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Content Requests Report (CSV)
router.get('/content-requests', auth, async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        
        let query = { ...getCompanyFilter(req) };
        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (status) query.status = status;
        
        const requests = await ContentRequest.find(query).lean();
        const flatRequests = requests.map(req => flattenObject(req));
        const csv = jsonToCSV(flatRequests);
        
        res.setHeader('Content-Disposition', 'attachment; filename=content_requests_report.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csv);
        
        console.log('📊 Content Requests Report Generated:', flatRequests.length, 'records');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Content Uploads Report (CSV)
router.get('/content-uploads', auth, async (req, res) => {
    try {
        const uploads = await ContentUpload.find(getCompanyFilter(req)).lean();
        const flatUploads = uploads.map(upload => flattenObject(upload));
        const csv = jsonToCSV(flatUploads);
        
        res.setHeader('Content-Disposition', 'attachment; filename=content_uploads_report.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csv);
        
        console.log('📊 Content Uploads Report Generated:', flatUploads.length, 'records');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Logistic Partners Report (CSV)
router.get('/logistic-partners', auth, async (req, res) => {
    try {
        const partners = await LogisticPartner.find(getCompanyFilter(req)).lean();
        
        // Only essential logistic partner fields
        const flatPartners = partners.map(partner => ({
            'Partner Name': partner.partnerName || 'N/A',
            'Partner Code': partner.partnerCode || 'N/A',
            'Contact Person': partner.contactPerson || 'N/A',
            'Email': partner.email || 'N/A',
            'Phone': partner.phone || 'N/A',
            'Service Type': partner.serviceType || 'N/A',
            'Coverage Area': partner.coverageArea?.join(', ') || 'N/A',
            'Delivery Charges': partner.deliveryCharges || 0,
            'Total Deliveries': partner.totalDeliveries || 0,
            'Status': partner.isActive ? 'Active' : 'Inactive'
        }));
        const csv = jsonToCSV(flatPartners);
        
        res.setHeader('Content-Disposition', 'attachment; filename=logistic_partners_report.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csv);
        
        console.log('📊 Logistic Partners Report Generated:', flatPartners.length, 'records');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Leads Report (CSV)
router.get('/leads', auth, async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        
        let query = { ...getCompanyFilter(req) };
        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (status) query.status = status;
        
        const leads = await Lead.find(query).lean();
        
        // Only essential lead fields
        const flatLeads = leads.map(lead => ({
            'Lead Name': lead.name || 'N/A',
            'Company': lead.company || 'N/A',
            'Email': lead.email || 'N/A',
            'Phone': lead.phone || 'N/A',
            'Source': lead.source || 'N/A',
            'Status': lead.status || 'New',
            'Interest Level': lead.interestLevel || 'Medium',
            'Expected Deal Value': lead.budget || 'N/A',
            'Product Interest': lead.productInterest || 'N/A',
            'Assigned To': lead.assignedTo || 'Unassigned',
            'Last Contact Date': lead.lastContactDate ? new Date(lead.lastContactDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never',
            'Next Follow Up': lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not Scheduled',
            'Notes': lead.notes || '',
            'Created Date': new Date(lead.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        }));
        const csv = jsonToCSV(flatLeads);
        
        res.setHeader('Content-Disposition', 'attachment; filename=leads_report.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csv);
        
        console.log('📊 Leads Report Generated:', flatLeads.length, 'records');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Contacts Report (CSV)
router.get('/contacts', auth, async (req, res) => {
    try {
        const contacts = await Contact.find(getCompanyFilter(req)).lean();
        
        // Only essential contact fields
        const flatContacts = contacts.map(contact => ({
            'Name': contact.name || 'N/A',
            'Email': contact.email || 'N/A',
            'Phone': contact.phone || 'N/A',
            'Company': contact.company || 'N/A',
            'Position': contact.position || 'N/A',
            'City': contact.city || 'N/A',
            'State': contact.state || 'N/A',
            'Contact Type': contact.contactType || 'General',
            'Notes': contact.notes || '',
            'Created Date': new Date(contact.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        }));
        const csv = jsonToCSV(flatContacts);
        
        res.setHeader('Content-Disposition', 'attachment; filename=contacts_report.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csv);
        
        console.log('📊 Contacts Report Generated:', flatContacts.length, 'records');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Users Report (CSV)
router.get('/users', auth, async (req, res) => {
    try {
        const users = await User.find(getCompanyFilter(req)).select('-password').lean();
        
        // Only essential user fields
        const flatUsers = users.map(user => ({
            'Name': user.name || 'N/A',
            'Email': user.email || 'N/A',
            'Phone': user.phone || 'N/A',
            'Role': user.role || 'User',
            'Department': user.department || 'N/A',
            'Status': user.isActive ? 'Active' : 'Inactive',
            'Created Date': new Date(user.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            'Last Login': user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never'
        }));
        const csv = jsonToCSV(flatUsers);
        
        res.setHeader('Content-Disposition', 'attachment; filename=users_report.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csv);
        
        console.log('📊 Users Report Generated:', flatUsers.length, 'records');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Retailers Report (CSV)
router.get('/retailers', auth, async (req, res) => {
    try {
        const retailers = await Retailer.find(getCompanyFilter(req)).lean();
        
        // Only essential retailer fields
        const flatRetailers = retailers.map(retailer => ({
            'Retailer Name': retailer.name || 'N/A',
            'Contact Person': retailer.contactPerson || 'N/A',
            'Email': retailer.email || 'N/A',
            'Phone': retailer.phone || 'N/A',
            'Alternate Phone': retailer.alternatePhone || 'N/A',
            'GST Number': retailer.gstNumber || 'N/A',
            'Address': retailer.address || 'N/A',
            'City': retailer.city || 'N/A',
            'State': retailer.state || 'N/A',
            'Pincode': retailer.pincode || 'N/A',
            'Total Orders': retailer.totalOrders || 0,
            'Total Business': retailer.totalBusiness || 0,
            'Last Order Date': retailer.lastOrderDate ? new Date(retailer.lastOrderDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never',
            'Status': retailer.isActive ? 'Active' : 'Inactive',
            'Onboarding Date': new Date(retailer.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        }));
        const csv = jsonToCSV(flatRetailers);
        
        res.setHeader('Content-Disposition', 'attachment; filename=retailers_report.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csv);
        
        console.log('📊 Retailers Report Generated:', flatRetailers.length, 'records');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Complete CRM Report (CSV - All data)
router.get('/complete-crm', auth, async (req, res) => {
    try {
        const compFilter = getCompanyFilter(req);
        const [orders, dispatches, services, leads, contacts] = await Promise.all([
            Order.countDocuments(compFilter),
            Dispatch.countDocuments(compFilter),
            ServiceRequest.countDocuments(compFilter),
            Lead.countDocuments(compFilter),
            Contact.countDocuments(compFilter)
        ]);
        
        const summary = [{
            'Report Type': 'Complete CRM Summary',
            'Generated At': new Date().toISOString(),
            'Total Orders': orders,
            'Total Dispatches': dispatches,
            'Total Service Requests': services,
            'Total Leads': leads,
            'Total Contacts': contacts,
            'Total Records': orders + dispatches + services + leads + contacts
        }];
        
        const csv = jsonToCSV(summary);
        
        res.setHeader('Content-Disposition', 'attachment; filename=complete_crm_summary.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csv);
        
        console.log('📊 Complete CRM Summary Generated');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Report Summary (metadata about available reports scoped to tenant & features)
router.get('/summary', auth, async (req, res) => {
    try {
        const compFilter = getCompanyFilter(req);

        let features = {
            orders: true,
            logistics: true,
            service: true,
            customers: true,
            sales: true,
            dashboard: true
        };

        if (req.user?.companyId) {
            const comp = await Company.findById(req.user.companyId).lean();
            if (comp && comp.features) {
                features = { ...features, ...comp.features };
            }
        }

        const [
            ordersCount,
            dispatchesCount,
            servicesCount,
            centersCount,
            contentRequestsCount,
            contentUploadsCount,
            partnersCount,
            leadsCount,
            contactsCount,
            usersCount,
            retailersCount
        ] = await Promise.all([
            Order.countDocuments(compFilter),
            Dispatch.countDocuments(compFilter),
            ServiceRequest.countDocuments(compFilter),
            ServiceCenter.countDocuments(compFilter),
            ContentRequest.countDocuments(compFilter),
            ContentUpload.countDocuments(compFilter),
            LogisticPartner.countDocuments(compFilter),
            Lead.countDocuments(compFilter),
            Contact.countDocuments(compFilter),
            User.countDocuments(compFilter),
            Retailer.countDocuments(compFilter)
        ]);

        const allReports = [
            { key: 'orders', name: 'Orders Report', type: 'excel', endpoint: '/api/reports/orders', records: ordersCount },
            { key: 'logistics', name: 'Deliveries Report', type: 'excel', endpoint: '/api/reports/deliveries', records: dispatchesCount },
            { key: 'service', name: 'Services Report', type: 'excel', endpoint: '/api/reports/services', records: servicesCount },
            { key: 'customers', name: 'Retailers Report', type: 'csv', endpoint: '/api/reports/retailers', records: retailersCount },
            { key: 'sales', name: 'Leads', type: 'csv', endpoint: '/api/reports/leads', records: leadsCount },
            { key: 'customers', name: 'Contacts', type: 'csv', endpoint: '/api/reports/contacts', records: contactsCount },
            { key: 'dashboard', name: 'Users', type: 'csv', endpoint: '/api/reports/users', records: usersCount },
            { key: 'service', name: 'Service Centers', type: 'csv', endpoint: '/api/reports/service-centers', records: centersCount },
            { key: 'logistics', name: 'Logistic Partners', type: 'csv', endpoint: '/api/reports/logistic-partners', records: partnersCount },
            { key: 'always', name: 'Complete CRM Summary', type: 'csv', endpoint: '/api/reports/complete-crm', records: 'Summary' }
        ];

        const availableReports = allReports.filter(r => r.key === 'always' || features[r.key] !== false);

        res.json({
            availableReports,
            totalRecords: availableReports.reduce((acc, curr) => acc + (typeof curr.records === 'number' ? curr.records : 0), 0)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Company Admin Complete Operational Business Intelligence Summary
router.get('/operational-summary', auth, async (req, res) => {
    try {
        let companyId = req.user.companyId;
        const role = String(req.user?.role || '').toLowerCase();
        if ((role === 'super-admin' || role === 'superadmin') && req.query.companyId) {
            companyId = req.query.companyId;
        }

        if (!companyId) {
            return res.status(400).json({ error: 'Company context required for operational report' });
        }

        const compObjectId = mongoose.Types.ObjectId.isValid(companyId) ? new mongoose.Types.ObjectId(companyId) : companyId;
        const query = { companyId: compObjectId };

        // 1. Sales & Orders
        const [
            leadsCount,
            convertedLeadsCount,
            orders,
            revenueAgg
        ] = await Promise.all([
            Lead.countDocuments(query),
            Lead.countDocuments({ ...query, status: { $in: ['converted', 'CONVERTED'] } }),
            Order.find(query).select('amount totalAmount status createdAt region').lean(),
            Order.aggregate([
                { $match: { companyId: compObjectId } },
                { $group: { _id: null, totalRevenue: { $sum: { $ifNull: ['$totalAmount', '$amount'] } }, count: { $sum: 1 } } }
            ])
        ]);

        const totalOrders = orders.length;
        const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
        const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

        // 2. Inventory & Stock
        const [
            totalUnits,
            availableUnits,
            inTransitUnits,
            distributorUnits,
            dealerUnits,
            retailerUnits,
            soldUnits,
            defectiveUnits
        ] = await Promise.all([
            SerialRegistry.countDocuments(query),
            SerialRegistry.countDocuments({ ...query, status: 'IN_STOCK' }),
            SerialRegistry.countDocuments({ ...query, status: 'IN_TRANSIT' }),
            SerialRegistry.countDocuments({ ...query, currentHolderType: 'DISTRIBUTOR' }),
            SerialRegistry.countDocuments({ ...query, currentHolderType: 'DEALER' }),
            SerialRegistry.countDocuments({ ...query, currentHolderType: 'RETAILER' }),
            SerialRegistry.countDocuments({ ...query, status: 'VALIDATED' }),
            SerialRegistry.countDocuments({ ...query, status: { $in: ['DEFECTIVE', 'RETURNED'] } })
        ]);

        // 3. Distribution & Transfers
        const [
            totalTransfers,
            pendingTransfers,
            completedTransfers
        ] = await Promise.all([
            StockTransfer.countDocuments(query),
            StockTransfer.countDocuments({ ...query, status: 'PENDING' }),
            StockTransfer.countDocuments({ ...query, status: 'ACCEPTED' })
        ]);

        // 4. Product / Serial Validations
        const [
            totalApiRequests,
            uniqueSerialsList,
            successfulValidations,
            dealerMismatches,
            invalidSerials
        ] = await Promise.all([
            SerialValidationHistory.countDocuments(query),
            SerialValidationHistory.distinct('serialNumber', query),
            SerialValidationHistory.countDocuments({ ...query, validationResult: 'VALID' }),
            SerialValidationHistory.countDocuments({ ...query, validationResult: 'DEALER_MISMATCH' }),
            SerialValidationHistory.countDocuments({ ...query, validationResult: 'INVALID_SERIAL' })
        ]);

        // 5. Service & SLAs
        const [
            openServiceCases,
            resolvedServiceCases,
            slaBreaches
        ] = await Promise.all([
            ServiceRequest.countDocuments({ ...query, status: { $in: ['open', 'in-progress', 'Open', 'Assigned', 'In Progress'] } }),
            ServiceRequest.countDocuments({ ...query, status: { $in: ['resolved', 'closed', 'Completed'] } }),
            ServiceRequest.countDocuments({ ...query, slaBreached: true })
        ]);

        // 6. Customers & Retailers
        const [
            totalRetailers,
            totalContacts
        ] = await Promise.all([
            Retailer.countDocuments(query),
            Contact.countDocuments(query)
        ]);

        // 7. API Summary
        const [
            totalApis,
            activeApis
        ] = await Promise.all([
            ApiKey.countDocuments(query),
            ApiKey.countDocuments({ ...query, status: 'ACTIVE' })
        ]);

        res.json({
            companyId,
            sales: {
                leads: leadsCount,
                convertedLeads: convertedLeadsCount,
                orders: totalOrders,
                revenue: totalRevenue,
                averageOrderValue
            },
            inventory: {
                totalUnits,
                availableUnits,
                inTransitUnits,
                distributorUnits,
                dealerUnits,
                retailerUnits,
                soldUnits,
                defectiveUnits
            },
            distribution: {
                totalTransfers,
                pendingTransfers,
                completedTransfers
            },
            serialValidations: {
                totalRequests: totalApiRequests,
                uniqueSerials: uniqueSerialsList.length,
                successfulValidations,
                dealerMismatches,
                invalidSerials
            },
            service: {
                openCases: openServiceCases,
                resolvedCases: resolvedServiceCases,
                slaBreaches
            },
            customers: {
                retailers: totalRetailers,
                contacts: totalContacts
            },
            api: {
                totalApis,
                activeApis,
                totalRequests: totalApiRequests,
                uniqueSerials: uniqueSerialsList.length
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
