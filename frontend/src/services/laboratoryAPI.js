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

    // Generate Barcodes PDF
    getBarcodesPDF: async (id) => {
        const response = await api.get(`/healthcare/laboratory/orders/${id}/barcodes/`, {
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
    }
};

export default laboratoryAPI;
