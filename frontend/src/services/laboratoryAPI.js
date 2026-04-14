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

    // Delete order (admin only)
    deleteOrder: async (id) => {
        await api.delete(`/healthcare/laboratory/orders/${id}/`);
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

    // Save current result as template for the test
    saveTestAsTemplate: async (itemId, resultValue) => {
        const response = await api.post(`/healthcare/laboratory/items/${itemId}/save-as-template/`, {
            result_value: resultValue
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
        const response = await api.patch(`/healthcare/laboratory/tests/${id}/`, data);
        return response.data;
    },

    // Delete test
    deleteTest: async (id) => {
        const response = await api.delete(`/healthcare/laboratory/tests/${id}/`);
        return response.data;
    },

    // Generate unique test code
    generateTestCode: async () => {
        const response = await api.get('/healthcare/laboratory/tests/generate-code/');
        return response.data;
    },

    // Test parameters (for compound tests)
    getTestParameters: async (testId) => {
        const response = await api.get(`/healthcare/laboratory/tests/${testId}/parameters/`);
        return response.data;
    },

    saveTestParameters: async (testId, parameters) => {
        const response = await api.post(`/healthcare/laboratory/tests/${testId}/parameters/bulk-save/`, { parameters });
        return response.data;
    },

    deleteParameter: async (parameterId) => {
        await api.delete(`/healthcare/laboratory/parameters/${parameterId}/`);
    },

    // PDF catalogue des valeurs de référence
    getReferenceCatalogPDF: async () => {
        const token = localStorage.getItem('access_token');
        const response = await api.get('/healthcare/laboratory/tests/reference-catalog/', {
            params: { token },
            responseType: 'blob',
        });
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
        const response = await api.patch(`/healthcare/laboratory/categories/${id}/`, data);
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
    },

    quickUpdateUnit: async (data) => {
        const response = await api.post('/healthcare/laboratory/quick-update-unit/', data);
        return response.data;
    },

    // --- Bilans (Lab Test Panels) ---

    getPanels: async (params = {}) => {
        const response = await api.get('/healthcare/laboratory/panels/', { params });
        return response.data;
    },

    getPanel: async (id) => {
        const response = await api.get(`/healthcare/laboratory/panels/${id}/`);
        return response.data;
    },

    createPanel: async (data) => {
        const response = await api.post('/healthcare/laboratory/panels/', data);
        return response.data;
    },

    updatePanel: async (id, data) => {
        const response = await api.patch(`/healthcare/laboratory/panels/${id}/`, data);
        return response.data;
    },

    deletePanel: async (id) => {
        await api.delete(`/healthcare/laboratory/panels/${id}/`);
    },

    // --- Prescribers ---

    getPrescribers: async (params = {}) => {
        const response = await api.get('/healthcare/laboratory/prescribers/', { params });
        return response.data;
    },

    getPrescriber: async (id) => {
        const response = await api.get(`/healthcare/laboratory/prescribers/${id}/`);
        return response.data;
    },

    createPrescriber: async (data) => {
        const response = await api.post('/healthcare/laboratory/prescribers/', data);
        return response.data;
    },

    updatePrescriber: async (id, data) => {
        const response = await api.patch(`/healthcare/laboratory/prescribers/${id}/`, data);
        return response.data;
    },

    deletePrescriber: async (id) => {
        await api.delete(`/healthcare/laboratory/prescribers/${id}/`);
    },

    // --- Subcontractor Labs ---

    getSubcontractors: async (params = {}) => {
        const response = await api.get('/healthcare/laboratory/subcontractors/', { params });
        return response.data;
    },

    getSubcontractor: async (id) => {
        const response = await api.get(`/healthcare/laboratory/subcontractors/${id}/`);
        return response.data;
    },

    createSubcontractor: async (data) => {
        const response = await api.post('/healthcare/laboratory/subcontractors/', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    updateSubcontractor: async (id, data) => {
        const response = await api.patch(`/healthcare/laboratory/subcontractors/${id}/`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    deleteSubcontractor: async (id) => {
        await api.delete(`/healthcare/laboratory/subcontractors/${id}/`);
    },

    getSubcontractorPrices: async (subcontractorId) => {
        const response = await api.get(`/healthcare/laboratory/subcontractors/${subcontractorId}/prices/`);
        return response.data;
    },

    saveSubcontractorPrices: async (subcontractorId, prices) => {
        const response = await api.post(
            `/healthcare/laboratory/subcontractors/${subcontractorId}/prices/bulk-save/`,
            prices
        );
        return response.data;
    },

    getSubcontractorTests: async (subcontractorId) => {
        const response = await api.get(`/healthcare/laboratory/subcontractors/${subcontractorId}/tests/`);
        return response.data;
    },

    bulkActivateSubcontractorPrices: async (subcontractorId, payload) => {
        const response = await api.post(
            `/healthcare/laboratory/subcontractors/${subcontractorId}/prices/bulk-activate/`,
            payload
        );
        return response.data;
    },

    getSubcontractorDefaultPrices: async () => {
        const response = await api.get('/healthcare/laboratory/subcontractors/default-prices/');
        return response.data;
    },

    saveSubcontractorDefaultPrices: async (prices) => {
        const response = await api.post(
            '/healthcare/laboratory/subcontractors/default-prices/bulk-save/',
            prices
        );
        return response.data;
    },

    // Subcontractor Patients
    getSubcontractorPatients: async (subcontractorId, params = {}) => {
        const response = await api.get(`/healthcare/laboratory/subcontractors/${subcontractorId}/patients/`, { params });
        return response.data;
    },

    createSubcontractorPatient: async (subcontractorId, data) => {
        const response = await api.post(`/healthcare/laboratory/subcontractors/${subcontractorId}/patients/`, data);
        return response.data;
    },

    updateSubcontractorPatient: async (subcontractorId, patientId, data) => {
        const response = await api.patch(`/healthcare/laboratory/subcontractors/${subcontractorId}/patients/${patientId}/`, data);
        return response.data;
    },

    deleteSubcontractorPatient: async (subcontractorId, patientId) => {
        await api.delete(`/healthcare/laboratory/subcontractors/${subcontractorId}/patients/${patientId}/`);
    },

    subcontractorBatchOrder: async (subcontractorId, payload) => {
        const response = await api.post(
            `/healthcare/laboratory/subcontractors/${subcontractorId}/batch-order/`,
            payload
        );
        return response.data;
    },

    getSubcontractorOrders: async (subcontractorId, params = {}) => {
        const response = await api.get('/healthcare/laboratory/orders/', {
            params: { subcontractor_id: subcontractorId, ...params }
        });
        return response.data;
    },

    // Consumables (stock links for lab tests)
    getTestConsumables: async (testId) => {
        const response = await api.get(`/healthcare/laboratory/tests/${testId}/consumables/`);
        return response.data;
    },
    addTestConsumable: async (testId, data) => {
        const response = await api.post(`/healthcare/laboratory/tests/${testId}/consumables/`, data);
        return response.data;
    },
    updateTestConsumable: async (consumableId, data) => {
        const response = await api.patch(`/healthcare/laboratory/consumables/${consumableId}/`, data);
        return response.data;
    },
    deleteTestConsumable: async (consumableId) => {
        const response = await api.delete(`/healthcare/laboratory/consumables/${consumableId}/`);
        return response.data;
    },
};

export default laboratoryAPI;
