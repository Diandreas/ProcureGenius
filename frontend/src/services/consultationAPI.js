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
        const response = await api.post('/healthcare/consultations/prescriptions/create/', data);
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

    // Get Consultation Receipt PDF (thermal)
    getConsultationReceiptPDF: async (id) => {
        const response = await api.get(`/healthcare/consultations/${id}/receipt/`, {
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
    },

    // ===== Workflow & Queue Management =====

    // Get consultation queue
    getQueue: async (params) => {
        const response = await api.get('/healthcare/consultations/queue/', { params });
        return response.data;
    },

    // Get next patient for current user role
    getNextPatient: async () => {
        const response = await api.get('/healthcare/consultations/next-patient/');
        return response.data;
    },

    // Nurse takes vital signs (waiting -> ready_for_doctor)
    takeVitals: async (id, vitalsData) => {
        const response = await api.post(`/healthcare/consultations/${id}/take-vitals/`, vitalsData);
        return response.data;
    },

    // Doctor starts consultation (ready_for_doctor -> in_consultation)
    startConsultationWorkflow: async (id) => {
        const response = await api.post(`/healthcare/consultations/${id}/start-consultation/`);
        return response.data;
    },

    // Complete consultation (in_consultation -> completed)
    completeConsultation: async (id) => {
        const response = await api.post(`/healthcare/consultations/${id}/complete/`);
        return response.data;
    },

    // ===== Lab Orders =====

    // Create lab order for consultation
    createLabOrder: async (data) => {
        const response = await api.post('/healthcare/consultations/lab-orders/create/', data);
        return response.data;
    },

    // ===== Consultation adaptée à la spécialité =====

    // Patient : allergies, dernière visite, mesures passées (courbes), dernières fiches par spécialité, vaccins
    getPatientContext: async (patientId, excludeId) => {
        const response = await api.get(`/healthcare/consultations/patient-context/${patientId}/`, {
            params: excludeId ? { exclude: excludeId } : {},
        });
        return response.data;
    },

    // Noms des médecins consultants déjà saisis
    getPractitioners: async () => {
        const response = await api.get('/healthcare/consultations/practitioners/');
        return response.data;
    },

    // Ordonnances déjà faites au centre pour un diagnostic proche
    getSimilarPrescriptions: async (diagnostic) => {
        const response = await api.get('/healthcare/consultations/similar-prescriptions/', { params: { diagnostic } });
        return response.data;
    },

    // Plus aucun médicament : supprime l'ordonnance non délivrée de la consultation
    clearPrescription: async (id) => {
        const response = await api.post(`/healthcare/consultations/${id}/clear-prescription/`);
        return response.data;
    },

    addPhoto: async (id, fichier, moment = 'avant', zone = '') => {
        const data = new FormData();
        data.append('image', fichier);
        data.append('moment', moment);
        data.append('zone', zone);
        const response = await api.post(`/healthcare/consultations/${id}/photos/`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    deletePhoto: async (id, photoId) => {
        await api.delete(`/healthcare/consultations/${id}/photos/`, { params: { photo: photoId } });
    }
};

export default consultationAPI;
