import api from './api';

const BASE = '/healthcare/maternity';

const maternityAPI = {
    // --- Pregnancies ---
    getPregnancies: async (params) => {
        const response = await api.get(`${BASE}/pregnancies/`, { params });
        return response.data;
    },
    getPregnancy: async (id) => {
        const response = await api.get(`${BASE}/pregnancies/${id}/`);
        return response.data;
    },
    createPregnancy: async (data) => {
        const response = await api.post(`${BASE}/pregnancies/`, data);
        return response.data;
    },
    updatePregnancy: async (id, data) => {
        const response = await api.patch(`${BASE}/pregnancies/${id}/`, data);
        return response.data;
    },
    deletePregnancy: async (id) => {
        await api.delete(`${BASE}/pregnancies/${id}/`);
    },

    // --- Prenatal visits (CPN) ---
    getPrenatalVisits: async (pregnancyId) => {
        const response = await api.get(`${BASE}/prenatal-visits/`, { params: { pregnancy: pregnancyId } });
        return response.data;
    },
    createPrenatalVisit: async (data) => {
        const response = await api.post(`${BASE}/prenatal-visits/`, data);
        return response.data;
    },
    generatePrenatalVisitInvoice: async (id) => {
        const response = await api.post(`${BASE}/prenatal-visits/${id}/generate-invoice/`);
        return response.data;
    },

    // --- Delivery ---
    createDelivery: async (data) => {
        const response = await api.post(`${BASE}/deliveries/`, data);
        return response.data;
    },
    updateDelivery: async (id, data) => {
        const response = await api.patch(`${BASE}/deliveries/${id}/`, data);
        return response.data;
    },
    generateDeliveryInvoice: async (id) => {
        const response = await api.post(`${BASE}/deliveries/${id}/generate-invoice/`);
        return response.data;
    },

    // --- Newborns ---
    createNewborn: async (data) => {
        const response = await api.post(`${BASE}/newborns/`, data);
        return response.data;
    },
    updateNewborn: async (id, data) => {
        const response = await api.patch(`${BASE}/newborns/${id}/`, data);
        return response.data;
    },

    // --- Postnatal visits ---
    getPostnatalVisits: async (deliveryId) => {
        const response = await api.get(`${BASE}/postnatal-visits/`, { params: { delivery: deliveryId } });
        return response.data;
    },
    createPostnatalVisit: async (data) => {
        const response = await api.post(`${BASE}/postnatal-visits/`, data);
        return response.data;
    },
    generatePostnatalVisitInvoice: async (id) => {
        const response = await api.post(`${BASE}/postnatal-visits/${id}/generate-invoice/`);
        return response.data;
    },
};

export default maternityAPI;
