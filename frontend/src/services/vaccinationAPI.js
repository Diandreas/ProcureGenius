import api from './api';

const BASE = '/healthcare/vaccination';

const vaccinationAPI = {
    // --- Categories ---
    getCategories: async () => {
        const response = await api.get(`${BASE}/categories/`);
        return response.data;
    },
    createCategory: async (data) => {
        const response = await api.post(`${BASE}/categories/`, data);
        return response.data;
    },

    // --- Vaccine types (catalogue) ---
    getVaccineTypes: async (params = {}) => {
        const response = await api.get(`${BASE}/vaccine-types/`, { params });
        return response.data;
    },
    createVaccineType: async (data) => {
        const response = await api.post(`${BASE}/vaccine-types/`, data);
        return response.data;
    },
    updateVaccineType: async (id, data) => {
        const response = await api.patch(`${BASE}/vaccine-types/${id}/`, data);
        return response.data;
    },
    deleteVaccineType: async (id) => {
        await api.delete(`${BASE}/vaccine-types/${id}/`);
    },

    // --- Vaccination records ---
    getPatientHistory: async (patientId) => {
        const response = await api.get(`${BASE}/patient/${patientId}/history/`);
        return response.data;
    },
    getRecords: async (params = {}) => {
        const response = await api.get(`${BASE}/records/`, { params });
        return response.data;
    },
    createRecord: async (data) => {
        const response = await api.post(`${BASE}/records/`, data);
        return response.data;
    },
    generateRecordInvoice: async (id) => {
        const response = await api.post(`${BASE}/records/${id}/generate-invoice/`);
        return response.data;
    },
    deleteRecord: async (id) => {
        await api.delete(`${BASE}/records/${id}/`);
    },
};

export default vaccinationAPI;
