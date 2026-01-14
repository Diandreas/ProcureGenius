import api from './api';

const pharmacyAPI = {
    // --- Dispensing ---

    // Get dispensing history / list
    getDispensingList: async (params) => {
        const response = await api.get('/healthcare/pharmacy/dispensings/', { params });
        return response.data;
    },

    // Get single dispensing record
    getDispensing: async (id) => {
        const response = await api.get(`/healthcare/pharmacy/dispensings/${id}/`);
        return response.data;
    },

    // Process dispensing (Create)
    createDispensing: async (data) => {
        const response = await api.post('/healthcare/pharmacy/dispensings/create/', data);
        return response.data;
    },

    // Generate Invoice (manual)
    generateInvoice: async (id) => {
        const response = await api.post(`/healthcare/pharmacy/dispensings/${id}/generate-invoice/`);
        return response.data;
    },

    // --- Inventory / Medications ---

    // Get medications list with stock
    getMedications: async (params) => {
        const response = await api.get('/healthcare/pharmacy/medications/', { params });
        return response.data;
    },

    // Check stock for specific medication
    checkStock: async (medicationId) => {
        const response = await api.get(`/healthcare/pharmacy/medications/${medicationId}/stock/`);
        return response.data;
    },

    // Get low stock alerts
    getLowStock: async () => {
        const response = await api.get('/healthcare/pharmacy/medications/low-stock/');
        return response.data;
    }
};

export default pharmacyAPI;
