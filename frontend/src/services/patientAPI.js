import api from './api';

const patientAPI = {
    // Get all patients with pagination and filtering
    getPatients: async (params) => {
        const response = await api.get('/healthcare/patients/', { params });
        return response.data;
    },

    // Get single patient details
    getPatient: async (id) => {
        const response = await api.get(`/healthcare/patients/${id}/`);
        return response.data;
    },

    // Create new patient
    createPatient: async (data) => {
        const response = await api.post('/healthcare/patients/', data);
        return response.data;
    },

    // Update patient
    updatePatient: async (id, data) => {
        const response = await api.put(`/healthcare/patients/${id}/`, data);
        return response.data;
    },

    // Get patient medical history
    getPatientHistory: async (id) => {
        const response = await api.get(`/healthcare/patients/${id}/history/`);
        return response.data;
    },

    // Get patient complete history (consultations, lab, pharmacy, care)
    getPatientCompleteHistory: async (id) => {
        const response = await api.get(`/healthcare/patients/${id}/complete-history/`);
        return response.data;
    },

    // Generate Medical History PDF
    getPatientHistoryPDF: async (id) => {
        const response = await api.get(`/healthcare/consultations/patient/${id}/history-pdf/`, {
            responseType: 'blob'
        });
        return response.data;
    },

    // Generate Patient Summary PDF (A4)
    getPatientSummaryPDF: async (id) => {
        const response = await api.get(`/healthcare/patients/${id}/summary/`, {
            responseType: 'blob'
        });
        return response.data;
    },

    // Register visit
    registerVisit: async (data) => {
        const response = await api.post('/healthcare/patients/visits/check-in/', data);
        return response.data;
    },

    // Update visit details (e.g. vitals)
    updateVisit: async (id, data) => {
        const response = await api.patch(`/healthcare/patients/visits/${id}/`, data);
        return response.data;
    },

    // Update visit status (e.g. start consultation)
    updateVisitStatus: async (id, action, notes) => {
        const response = await api.post(`/healthcare/patients/visits/${id}/status/`, { action, notes });
        return response.data;
    },

    // Get Today's Visits (Dashboard)
    getTodayVisits: async () => {
        const response = await api.get('/healthcare/patients/visits/today/');
        return response.data;
    },

    // Get patient care service history
    getPatientCareHistory: async (patientId) => {
        const response = await api.get(`/healthcare/patients/${patientId}/care-history/`);
        return response.data;
    }
};

export default patientAPI;
