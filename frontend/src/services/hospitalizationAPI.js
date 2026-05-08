import api from './api';

const hospitalizationAPI = {
    getAll: async (params) => {
        const response = await api.get('/healthcare/hospitalizations/', { params });
        return response.data;
    },

    get: async (id) => {
        const response = await api.get(`/healthcare/hospitalizations/${id}/`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/healthcare/hospitalizations/', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.patch(`/healthcare/hospitalizations/${id}/`, data);
        return response.data;
    },

    discharge: async (id, data) => {
        const response = await api.post(`/healthcare/hospitalizations/${id}/discharge/`, data);
        return response.data;
    },

    getDischargePDF: async (id) => {
        const response = await api.get(`/healthcare/hospitalizations/${id}/discharge-pdf/`, {
            responseType: 'blob'
        });
        return response.data;
    }
};

export default hospitalizationAPI;
