import api from './api';

const supportAPI = {
    createTicket: async (formData) => {
        const response = await api.post('/support/tickets/', formData);
        return response.data;
    },

    getMyTickets: async () => {
        const response = await api.get('/support/tickets/mine/');
        return response.data;
    },

    getTickets: async (params) => {
        const response = await api.get('/support/tickets/list/', { params });
        return response.data;
    },

    updateTicket: async (id, data) => {
        const response = await api.patch(`/support/tickets/${id}/`, data);
        return response.data;
    },
};

export default supportAPI;
