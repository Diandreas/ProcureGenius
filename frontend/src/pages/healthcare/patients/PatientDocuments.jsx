import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    Description as FileIcon,
    Download as DownloadIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import documentsAPI from '../../../services/documentsAPI';
import { formatDate } from '../../../utils/formatters';

const PatientDocuments = ({ patientId }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openUpload, setOpenUpload] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (patientId) {
            fetchDocuments();
        }
    }, [patientId]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const data = await documentsAPI.list(patientId);
            setDocuments(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error loading documents:', error);
            enqueueSnackbar('Erreur de chargement des documents', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!file || !title) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', title);
            formData.append('description', description);

            await documentsAPI.create(patientId, formData);
            enqueueSnackbar('Document ajouté avec succès', { variant: 'success' });
            setOpenUpload(false);
            resetForm();
            fetchDocuments();
        } catch (error) {
            console.error('Error uploading:', error);
            enqueueSnackbar('Erreur lors de l\'upload', { variant: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;
        try {
            await documentsAPI.delete(id);
            enqueueSnackbar('Document supprimé', { variant: 'success' });
            fetchDocuments();
        } catch (error) {
            enqueueSnackbar('Erreur de suppression', { variant: 'error' });
        }
    };

    const resetForm = () => {
        setFile(null);
        setTitle('');
        setDescription('');
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Documents Médicaux</Typography>
                <Button
                    variant="contained"
                    startIcon={<UploadIcon />}
                    onClick={() => setOpenUpload(true)}
                >
                    Ajouter un document
                </Button>
            </Box>

            {loading ? (
                <CircularProgress />
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Titre</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Fichier</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {documents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography color="text.secondary">Aucun document</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                documents.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell>{formatDate(doc.uploaded_at)}</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>{doc.title}</TableCell>
                                        <TableCell>{doc.description}</TableCell>
                                        <TableCell>
                                            <a href={doc.file} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                                                <FileIcon sx={{ mr: 1, fontSize: 20 }} />
                                                Voir
                                            </a>
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton color="error" size="small" onClick={() => handleDelete(doc.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Upload Dialog */}
            <Dialog open={openUpload} onClose={() => setOpenUpload(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Ajouter un document</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Titre du document"
                            fullWidth
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <TextField
                            label="Description (optionnel)"
                            fullWidth
                            multiline
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                        <Button
                            variant="outlined"
                            component="label"
                            startIcon={<UploadIcon />}
                            fullWidth
                            sx={{ height: 100, borderStyle: 'dashed' }}
                        >
                            {file ? file.name : 'Sélectionner un fichier'}
                            <input
                                type="file"
                                hidden
                                onChange={(e) => setFile(e.target.files[0])}
                            />
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenUpload(false)}>Annuler</Button>
                    <Button
                        onClick={handleUpload}
                        variant="contained"
                        disabled={!file || !title || uploading}
                    >
                        {uploading ? 'Envoi...' : 'Enregistrer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PatientDocuments;
