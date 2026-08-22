/**
 * Charlie's CRM — Company Operational Reports Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    loadOperationalReport();
});

async function loadOperationalReport() {
    const token = localStorage.getItem('authToken');
    try {
        const res = await fetch('/api/reports/operational-summary', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load operational report');

        const data = await res.json();

        // 1. Sales
        document.getElementById('salesLeads').textContent = (data.sales.leads || 0).toLocaleString();
        document.getElementById('salesConverted').textContent = `${(data.sales.convertedLeads || 0).toLocaleString()} Converted`;
        document.getElementById('salesOrders').textContent = (data.sales.orders || 0).toLocaleString();
        document.getElementById('salesRevenue').textContent = `₹${(data.sales.revenue || 0).toLocaleString()}`;
        document.getElementById('salesAov').textContent = `₹${(data.sales.averageOrderValue || 0).toLocaleString()}`;

        // 2. Inventory
        document.getElementById('invTotal').textContent = (data.inventory.totalUnits || 0).toLocaleString();
        document.getElementById('invAvailable').textContent = (data.inventory.availableUnits || 0).toLocaleString();
        document.getElementById('invInTransit').textContent = (data.inventory.inTransitUnits || 0).toLocaleString();
        document.getElementById('invDistributor').textContent = (data.inventory.distributorUnits || 0).toLocaleString();
        document.getElementById('invDealer').textContent = (data.inventory.dealerUnits || 0).toLocaleString();
        document.getElementById('invSold').textContent = (data.inventory.soldUnits || 0).toLocaleString();

        // 3. Distribution
        document.getElementById('distTransfers').textContent = (data.distribution.totalTransfers || 0).toLocaleString();
        document.getElementById('distPending').textContent = (data.distribution.pendingTransfers || 0).toLocaleString();
        document.getElementById('distCompleted').textContent = (data.distribution.completedTransfers || 0).toLocaleString();

        // 4. API & Serial Validations
        document.getElementById('apiRequests').textContent = (data.serialValidations.totalRequests || 0).toLocaleString();
        document.getElementById('apiUniqueSerials').textContent = (data.serialValidations.uniqueSerials || 0).toLocaleString();
        document.getElementById('apiValid').textContent = (data.serialValidations.successfulValidations || 0).toLocaleString();
        document.getElementById('apiMismatch').textContent = (data.serialValidations.dealerMismatches || 0).toLocaleString();

        // 5. Service
        document.getElementById('svcOpen').textContent = (data.service.openCases || 0).toLocaleString();
        document.getElementById('svcResolved').textContent = (data.service.resolvedCases || 0).toLocaleString();
        document.getElementById('svcBreaches').textContent = (data.service.slaBreaches || 0).toLocaleString();

    } catch (err) {
        console.error('Error loading operational report:', err);
    }
}
