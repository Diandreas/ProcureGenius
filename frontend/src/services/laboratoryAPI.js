import api from './api';

const laboratoryAPI = {
    // --- Lab Orders ---

    // Get all orders with pagination/filtering
    getOrders: async (params) => {
        const response = await api.get('/healthcare/laboratory/orders/', { params });
        return response.data; // { results: [], count: ... } or [] depending on backend pagination
    },

    // Get filtered orders (e.g. today's pending)
    getTodayOrders: async () => {
        const response = await api.get('/healthcare/laboratory/orders/today/');
        return response.data;
    },

    // Get single order details
    getOrder: async (id) => {
        const response = await api.get(`/healthcare/laboratory/orders/${id}/`);
        return response.data;
    },

    // Create new order
    createOrder: async (data) => {
        const response = await api.post('/healthcare/laboratory/orders/create/', data);
        return response.data;
    },

    // Update order status
    updateStatus: async (id, statusData) => {
        const response = await api.post(`/healthcare/laboratory/orders/${id}/status/`, statusData);
        return response.data;
    },

    // Enter results
    enterResults: async (id, resultsData) => {
        // resultsData: { items: [{ item_id, result_value, ... }, ...] }
        const response = await api.post(`/healthcare/laboratory/orders/${id}/results/`, resultsData);
        return response.data;
    },

    // Generate Result PDF
    getResultsPDF: async (id, params = {}) => {
        const response = await api.get(`/healthcare/laboratory/orders/${id}/pdf/`, {
            params,
            responseType: 'blob'
        });
        return response.data;
    },

    // Generate Receipt PDF (thermal)
    getReceiptPDF: async (id) => {
        const response = await api.get(`/healthcare/laboratory/orders/${id}/receipt/`, {
            responseType: 'blob'
        });
        return response.data;
    },

    // Generate Barcodes PDF
    getBarcodesPDF: async (id, params = {}) => {
        const response = await api.get(`/healthcare/laboratory/orders/${id}/barcodes/`, {
            params,
            responseType: 'blob'
        });
        return response.data;
    },

    // Generate Tube Labels PDF (60x40mm thermal labels)
    getTubeLabelsPDF: async (id, params = {}) => {
        const response = await api.get(`/healthcare/laboratory/orders/${id}/tube-labels/`, {
            params,
            responseType: 'blob'
        });
        return response.data;
    },

    // Generate Bench Sheet PDF
    getBenchSheetPDF: async (id) => {
        const response = await api.get(`/healthcare/laboratory/orders/${id}/bench-sheet/`, {
            responseType: 'blob'
        });
        return response.data;
    },

    // Generate Bulk Bench Sheets PDF
    getBulkBenchSheetsPDF: async (params = {}) => {
        const response = await api.get('/healthcare/laboratory/orders/bulk-bench-sheets/', {
            params,
            responseType: 'blob'
        });
        return response.data;
    },

    // Generate Invoice (manual)
    generateInvoice: async (id) => {
        const response = await api.post(`/healthcare/laboratory/orders/${id}/generate-invoice/`);
        return response.data;
    },

    // Get previous results for a lab order item
    getItemHistory: async (itemId) => {
        const response = await api.get(`/healthcare/laboratory/items/${itemId}/history/`);
        return response.data;
    },

    // --- Test Catalog ---

    // Get all lab tests (for selection)
    getTests: async (params) => {
        const response = await api.get('/healthcare/laboratory/tests/', { params });
        return response.data;
    },

    // Get categories
    getCategories: async () => {
        const response = await api.get('/healthcare/laboratory/categories/');
        return response.data;
    },

    // --- Test Catalog CRUD ---

    // Get single test
    getTest: async (id) => {
        const response = await api.get(`/healthcare/laboratory/tests/${id}/`);
        return response.data;
    },

    // Create test
    createTest: async (data) => {
        const response = await api.post('/healthcare/laboratory/tests/', data);
        return response.data;
    },

    // Update test
    updateTest: async (id, data) => {
        const response = await api.put(`/healthcare/laboratory/tests/${id}/`, data);
        return response.data;
    },

    // Delete test
    deleteTest: async (id) => {
        const response = await api.delete(`/healthcare/laboratory/tests/${id}/`);
        return response.data;
    },

    // --- Category CRUD ---

    // Create category
    createCategory: async (data) => {
        const response = await api.post('/healthcare/laboratory/categories/', data);
        return response.data;
    },

    // Update category
    updateCategory: async (id, data) => {
        const response = await api.put(`/healthcare/laboratory/categories/${id}/`, data);
        return response.data;
    },

    // Delete category
    deleteCategory: async (id) => {
        const response = await api.delete(`/healthcare/laboratory/categories/${id}/`);
        return response.data;
    },

    // --- Sample Collection ---

    // Collect sample for a lab order
    collectSample: async (orderId) => {
        const response = await api.post(`/healthcare/laboratory/orders/${orderId}/status/`, { action: 'collect_sample' });
        return response.data;
    }
};

export default laboratoryAPI;
