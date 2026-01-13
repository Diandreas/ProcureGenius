import api from './api';

const documentsAPI = {
    // List/Create documents for a patient
    list: async (patientId) => {
        const response = await api.get(`/healthcare/patients/${patientId}/documents/`);
        return response.data;
    },

    create: async (patientId, formData) => {
        // formData must contain 'file', 'title', etc.
        const response = await api.post(`/healthcare/patients/${patientId}/documents/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Get/Delete single document
    get: async (id) => {
        const response = await api.get(`/healthcare/patients/documents/${id}/`);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/healthcare/patients/documents/${id}/`);
        return response.data;
    }
};

export default documentsAPI;
