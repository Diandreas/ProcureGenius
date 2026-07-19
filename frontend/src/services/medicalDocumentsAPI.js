import api from './api';

const medicalDocumentsAPI = {
    getAll: async (params) => {
        const response = await api.get('/healthcare/medical-documents/', { params });
        return response.data;
    },

    get: async (id) => {
        const response = await api.get(`/healthcare/medical-documents/${id}/`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/healthcare/medical-documents/', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.patch(`/healthcare/medical-documents/${id}/`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/healthcare/medical-documents/${id}/`);
        return response.data;
    },

    getPDF: async (id) => {
        const response = await api.get(`/healthcare/medical-documents/${id}/pdf/`, {
            responseType: 'blob'
        });
        return response.data;
    }
};

export default medicalDocumentsAPI;
