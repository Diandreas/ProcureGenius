import api from './api';

const imagingAPI = {
    // --- Imaging Orders ---

    getOrders: async (params) => {
        const response = await api.get('/healthcare/imaging/orders/', { params });
        return response.data;
    },

    getTodayOrders: async () => {
        const response = await api.get('/healthcare/imaging/orders/today/');
        return response.data;
    },

    getOrder: async (id) => {
        const response = await api.get(`/healthcare/imaging/orders/${id}/`);
        return response.data;
    },

    createOrder: async (data) => {
        const response = await api.post('/healthcare/imaging/orders/create/', data);
        return response.data;
    },

    updateStatus: async (id, statusData) => {
        const response = await api.post(`/healthcare/imaging/orders/${id}/status/`, statusData);
        return response.data;
    },

    deleteOrder: async (id) => {
        await api.delete(`/healthcare/imaging/orders/${id}/`);
    },

    // resultsData: { items: [{ item_id, report_text, technician_notes, is_urgent_finding }, ...] }
    enterResults: async (id, resultsData) => {
        const response = await api.post(`/healthcare/imaging/orders/${id}/results/`, resultsData);
        return response.data;
    },

    getResultsPDF: async (id) => {
        const response = await api.get(`/healthcare/imaging/orders/${id}/pdf/`, { responseType: 'blob' });
        return response.data;
    },

    generateInvoice: async (id) => {
        const response = await api.post(`/healthcare/imaging/orders/${id}/generate-invoice/`);
        return response.data;
    },

    getPatientHistory: async (patientId) => {
        const response = await api.get(`/healthcare/imaging/patient/${patientId}/history/`);
        return response.data;
    },

    // --- Result files ---

    uploadResultFile: async (itemId, formData) => {
        const response = await api.post(`/healthcare/imaging/items/${itemId}/files/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    getResultFiles: async (itemId) => {
        const response = await api.get(`/healthcare/imaging/items/${itemId}/files/`);
        return response.data;
    },

    deleteResultFile: async (fileId) => {
        await api.delete(`/healthcare/imaging/files/${fileId}/`);
    },

    // --- Exam catalogue ---

    getCategories: async () => {
        const response = await api.get('/healthcare/imaging/categories/');
        return response.data;
    },

    createCategory: async (data) => {
        const response = await api.post('/healthcare/imaging/categories/', data);
        return response.data;
    },

    updateCategory: async (id, data) => {
        const response = await api.patch(`/healthcare/imaging/categories/${id}/`, data);
        return response.data;
    },

    deleteCategory: async (id) => {
        await api.delete(`/healthcare/imaging/categories/${id}/`);
    },

    getExamTypes: async (params = {}) => {
        const response = await api.get('/healthcare/imaging/exam-types/', { params });
        return response.data;
    },

    getExamType: async (id) => {
        const response = await api.get(`/healthcare/imaging/exam-types/${id}/`);
        return response.data;
    },

    createExamType: async (data) => {
        const response = await api.post('/healthcare/imaging/exam-types/', data);
        return response.data;
    },

    updateExamType: async (id, data) => {
        const response = await api.patch(`/healthcare/imaging/exam-types/${id}/`, data);
        return response.data;
    },

    deleteExamType: async (id) => {
        await api.delete(`/healthcare/imaging/exam-types/${id}/`);
    },

    // --- Sous-traitance (réutilise les sous-traitants du module Laboratoire) ---

    batchOrder: async (subcontractorId, payload) => {
        const response = await api.post(
            `/healthcare/imaging/subcontractors/${subcontractorId}/batch-order/`,
            payload
        );
        return response.data;
    },

    getSubcontractorOrders: async (subcontractorId, params = {}) => {
        const response = await api.get('/healthcare/imaging/orders/', {
            params: { subcontractor_id: subcontractorId, ...params },
        });
        return response.data;
    },
};

export default imagingAPI;
