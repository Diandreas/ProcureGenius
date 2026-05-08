import api from './api';

const documentGeneratorAPI = {
    // OrganizationDocument CRUD
    getDocuments: async (params) => {
        const response = await api.get('/documents/documents/', { params });
        return response.data;
    },

    getDocument: async (id) => {
        const response = await api.get(`/documents/documents/${id}/`);
        return response.data;
    },

    createDocument: async (data) => {
        const response = await api.post('/documents/documents/', data);
        return response.data;
    },

    updateDocument: async (id, data) => {
        const response = await api.patch(`/documents/documents/${id}/`, data);
        return response.data;
    },

    // HealthPackage CRUD
    getPackages: async (params) => {
        const response = await api.get('/documents/packages/', { params });
        return response.data;
    },

    createPackage: async (data) => {
        const response = await api.post('/documents/packages/', data);
        return response.data;
    },

    updatePackage: async (id, data) => {
        const response = await api.patch(`/documents/packages/${id}/`, data);
        return response.data;
    },

    deletePackage: async (id) => {
        await api.delete(`/documents/packages/${id}/`);
    },

    // PDF generation
    generatePDF: async (docType) => {
        const response = await api.get(`/documents/generate/${docType}/pdf/`, {
            responseType: 'blob'
        });
        return response.data;
    }
};

export default documentGeneratorAPI;
