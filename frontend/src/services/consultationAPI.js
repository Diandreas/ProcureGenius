import api from './api';

const consultationAPI = {
    // Get all consultations with pagination/filtering
    getConsultations: async (params) => {
        const response = await api.get('/healthcare/consultations/', { params });
        return response.data;
    },

    // Get single consultation details
    getConsultation: async (id) => {
        const response = await api.get(`/healthcare/consultations/${id}/`);
        return response.data;
    },

    // Create new consultation (Start/End)
    createConsultation: async (data) => {
        const response = await api.post('/healthcare/consultations/', data);
        return response.data;
    },

    // Update consultation (Add notes, diagnosis, vitals)
    updateConsultation: async (id, data) => {
        const response = await api.patch(`/healthcare/consultations/${id}/`, data);
        return response.data;
    },

    // Create Prescription
    createPrescription: async (data) => {
        const response = await api.post('/healthcare/consultations/prescriptions/', data);
        return response.data;
    },

    // Get Prescription PDF
    getPrescriptionPDF: async (id) => {
        const response = await api.get(`/healthcare/consultations/prescriptions/${id}/pdf/`, {
            responseType: 'blob'
        });
        return response.data;
    },

    // Get Consultation Report PDF
    getConsultationReportPDF: async (id) => {
        const response = await api.get(`/healthcare/consultations/${id}/report/`, {
            responseType: 'blob'
        });
        return response.data;
    },

    // Get Patient Medical History PDF
    getHistoryPDF: async (patientId) => {
        const response = await api.get(`/healthcare/consultations/patient/${patientId}/history-pdf/`, {
            responseType: 'blob'
        });
        return response.data;
    },

    // Generate Invoice (manual)
    generateInvoice: async (id) => {
        const response = await api.post(`/healthcare/consultations/${id}/generate-invoice/`);
        return response.data;
    }
};

export default consultationAPI;
