/**
 * DataImportPage - Page d'importation intelligente des données
 * 
 * Interface intuitive pour importer des données depuis Excel/CSV
 * avec mapping automatique et suivi en temps réel.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    Stepper,
    Step,
    StepLabel,
    Alert,
    AlertTitle,
    LinearProgress,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    IconButton,
    Stack,
    Divider,
    Fade,
    Zoom,
    useTheme,
    useMediaQuery,
    CircularProgress,
    FormControlLabel,
    Switch,
    Breadcrumbs,
    Link,
} from '@mui/material';
import {
    CloudUpload,
    InsertDriveFile,
    CheckCircle,
    Error as ErrorIcon,
    Business,
    People,
    Inventory,
    LocalShipping,
    Receipt,
    Description,
    AutoAwesome,
    ArrowBack,
    ArrowForward,
    Download,
    Refresh,
    Settings,
    History,
    FileDownload,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import {
    createMigrationJob,
    previewMigrationData,
    configureMigration,
    startMigration,
    fetchMigrationJob,
    fetchMigrationLogs,
    clearPreview,
} from '../../store/slices/migrationSlice';
import { suppliersAPI, productsAPI, clientsAPI } from '../../services/api';

// Configuration des types d'entités importables
const ENTITY_CONFIGS = {
    suppliers: {
        label: 'Fournisseurs',
        icon: LocalShipping,
        color: '#2563eb',
        gradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
        description: 'Importez votre liste de fournisseurs avec leurs coordonnées',
        fields: {
            required: ['name'],
            optional: ['email', 'phone', 'address', 'city', 'country', 'contact_name', 'payment_terms', 'notes'],
        },
        fieldLabels: {
            name: 'Nom',
            email: 'Email',
            phone: 'Téléphone',
            address: 'Adresse',
            city: 'Ville',
            country: 'Pays',
            contact_name: 'Contact',
            payment_terms: 'Conditions paiement',
            notes: 'Notes',
        },
        suggestedMappings: {
            'nom': 'name', 'name': 'name', 'fournisseur': 'name', 'supplier': 'name', 'raison_sociale': 'name',
            'email': 'email', 'courriel': 'email', 'mail': 'email', 'e-mail': 'email',
            'telephone': 'phone', 'téléphone': 'phone', 'phone': 'phone', 'tel': 'phone', 'mobile': 'phone',
            'adresse': 'address', 'address': 'address',
            'ville': 'city', 'city': 'city',
            'pays': 'country', 'country': 'country',
            'contact': 'contact_name', 'contact_name': 'contact_name', 'responsable': 'contact_name',
        },
    },
    products: {
        label: 'Produits',
        icon: Inventory,
        color: '#059669',
        gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        description: 'Importez votre catalogue de produits avec prix et stocks',
        fields: {
            required: ['name'],
            optional: ['reference', 'sku', 'description', 'unit_price', 'cost_price', 'quantity_in_stock', 'category', 'unit'],
        },
        fieldLabels: {
            name: 'Nom',
            reference: 'Référence',
            sku: 'SKU',
            description: 'Description',
            unit_price: 'Prix unitaire',
            cost_price: 'Prix d\'achat',
            quantity_in_stock: 'Stock',
            category: 'Catégorie',
            unit: 'Unité',
        },
        suggestedMappings: {
            'nom': 'name', 'name': 'name', 'produit': 'name', 'product': 'name', 'designation': 'name', 'désignation': 'name', 'libelle': 'name',
            'reference': 'reference', 'référence': 'reference', 'ref': 'reference', 'code': 'reference',
            'sku': 'sku',
            'description': 'description', 'desc': 'description',
            'prix': 'unit_price', 'price': 'unit_price', 'prix_vente': 'unit_price', 'prix_unitaire': 'unit_price', 'pv': 'unit_price', 'pu': 'unit_price',
            'cout': 'cost_price', 'cost': 'cost_price', 'prix_achat': 'cost_price', 'pa': 'cost_price',
            'stock': 'quantity_in_stock', 'quantity': 'quantity_in_stock', 'quantite': 'quantity_in_stock', 'qté': 'quantity_in_stock', 'qte': 'quantity_in_stock',
            'categorie': 'category', 'category': 'category', 'cat': 'category', 'famille': 'category',
            'unite': 'unit', 'unit': 'unit',
        },
    },
    clients: {
        label: 'Clients',
        icon: People,
        color: '#7c3aed',
        gradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
        description: 'Importez votre base de clients avec leurs informations',
        fields: {
            required: ['name'],
            optional: ['email', 'phone', 'address', 'city', 'country', 'contact_name', 'credit_limit', 'notes'],
        },
        fieldLabels: {
            name: 'Nom',
            email: 'Email',
            phone: 'Téléphone',
            address: 'Adresse',
            city: 'Ville',
            country: 'Pays',
            contact_name: 'Contact',
            credit_limit: 'Limite de crédit',
            notes: 'Notes',
        },
        suggestedMappings: {
            'nom': 'name', 'name': 'name', 'client': 'name', 'customer': 'name', 'raison_sociale': 'name', 'societe': 'name', 'société': 'name',
            'email': 'email', 'courriel': 'email', 'mail': 'email', 'e-mail': 'email',
            'telephone': 'phone', 'téléphone': 'phone', 'phone': 'phone', 'tel': 'phone', 'mobile': 'phone',
            'adresse': 'address', 'address': 'address',
            'ville': 'city', 'city': 'city',
            'pays': 'country', 'country': 'country',
            'contact': 'contact_name', 'responsable': 'contact_name',
        },
    },
};

const STEPS = ['Sélection', 'Fichier', 'Mapping', 'Aperçu', 'Import'];

/**
 * Carte de sélection d'entité
 */
const EntityCard = ({ entityKey, config, selected, onClick }) => {
    const Icon = config.icon;

    return (
        <Card
            onClick={onClick}
            sx={{
                cursor: 'pointer',
                borderRadius: 3,
                border: selected ? `3px solid ${config.color}` : '3px solid transparent',
                background: selected ? `${config.color}08` : '#fff',
                boxShadow: selected ? `0 8px 32px ${config.color}30` : '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: `0 12px 40px ${config.color}25`,
                    borderColor: config.color,
                },
            }}
        >
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Box
                    sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2,
                        background: config.gradient,
                        boxShadow: `0 8px 24px ${config.color}40`,
                    }}
                >
                    <Icon sx={{ fontSize: 40, color: 'white' }} />
                </Box>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                    {config.label}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ minHeight: 48 }}>
                    {config.description}
                </Typography>
                {selected && (
                    <Chip
                        icon={<CheckCircle />}
                        label="Sélectionné"
                        color="success"
                        size="small"
                        sx={{ mt: 2 }}
                    />
                )}
            </CardContent>
        </Card>
    );
};

/**
 * Zone de drop de fichier
 */
const FileDropzone = ({ onFileAccepted, acceptedFile, entityConfig }) => {
    const theme = useTheme();

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            onFileAccepted(acceptedFiles[0]);
        }
    }, [onFileAccepted]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        },
        multiple: false,
        maxSize: 10 * 1024 * 1024,
    });

    const bgColor = entityConfig?.color || theme.palette.primary.main;

    return (
        <Box
            {...getRootProps()}
            sx={{
                border: '3px dashed',
                borderColor: isDragActive ? bgColor : acceptedFile ? '#059669' : '#d1d5db',
                borderRadius: 4,
                p: 5,
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragActive ? `${bgColor}08` : acceptedFile ? '#f0fdf4' : '#fafafa',
                transition: 'all 0.3s ease',
                '&:hover': {
                    borderColor: bgColor,
                    background: `${bgColor}05`,
                },
            }}
        >
            <input {...getInputProps()} />

            {acceptedFile ? (
                <Fade in>
                    <Box>
                        <InsertDriveFile sx={{ fontSize: 72, color: '#059669', mb: 2 }} />
                        <Typography variant="h6" gutterBottom color="success.main" fontWeight={600}>
                            Fichier sélectionné !
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                            {acceptedFile.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {(acceptedFile.size / 1024).toFixed(1)} Ko
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            sx={{ mt: 2 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onFileAccepted(null);
                            }}
                        >
                            Changer de fichier
                        </Button>
                    </Box>
                </Fade>
            ) : (
                <Box>
                    <CloudUpload sx={{ fontSize: 72, color: '#9ca3af', mb: 2 }} />
                    <Typography variant="h5" gutterBottom fontWeight={600}>
                        {isDragActive ? 'Déposez votre fichier ici !' : 'Glissez-déposez votre fichier'}
                    </Typography>
                    <Typography color="text.secondary" paragraph>
                        ou cliquez pour sélectionner un fichier
                    </Typography>
                    <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                        <Chip label="CSV" color="primary" variant="outlined" />
                        <Chip label="Excel (.xlsx)" color="primary" variant="outlined" />
                        <Chip label="Max 10 Mo" variant="outlined" />
                    </Stack>
                </Box>
            )}
        </Box>
    );
};

/**
 * Page principale d'importation
 */
const DataImportPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { t } = useTranslation(['settings', 'common']);

    const { currentJob, previewData, availableFields, logs, loading, error } = useSelector(
        (state) => state.migration
    );

    // État du wizard
    const [activeStep, setActiveStep] = useState(0);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [importName, setImportName] = useState('');
    const [fieldMapping, setFieldMapping] = useState({});
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const [updateExisting, setUpdateExisting] = useState(false);
    const [hasHeader, setHasHeader] = useState(true);
    const [delimiter, setDelimiter] = useState(',');
    const [localPreview, setLocalPreview] = useState(null);
    const [localLoading, setLocalLoading] = useState(false);
    const [importError, setImportError] = useState(null);
    const [pollingInterval, setPollingInterval] = useState(null);

    // Polling pour le statut du job
    useEffect(() => {
        if (currentJob && currentJob.status === 'processing') {
            const interval = setInterval(() => {
                dispatch(fetchMigrationJob(currentJob.id));
                dispatch(fetchMigrationLogs(currentJob.id));
            }, 2000);
            setPollingInterval(interval);
            return () => clearInterval(interval);
        } else if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }
    }, [currentJob?.status, currentJob?.id, dispatch]);

    // Nettoyage au démontage
    useEffect(() => {
        return () => {
            if (pollingInterval) clearInterval(pollingInterval);
            dispatch(clearPreview());
        };
    }, []);

    // Parser CSV local pour l'aperçu
    const parseCSVPreview = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n').filter(line => line.trim());
                    if (lines.length === 0) {
                        reject(new Error('Le fichier est vide'));
                        return;
                    }
                    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, '').replace(/^\uFEFF/, ''));
                    const data = [];

                    for (let i = 1; i < Math.min(lines.length, 6); i++) {
                        if (lines[i].trim()) {
                            const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''));
                            const row = {};
                            headers.forEach((header, index) => {
                                row[header] = values[index] || '';
                            });
                            data.push(row);
                        }
                    }

                    resolve({ headers, data, totalRows: lines.length - 1 });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
            reader.readAsText(file, 'UTF-8');
        });
    };

    // Suggestion automatique du mapping
    const suggestMapping = (headers) => {
        if (!selectedEntity) return {};

        const config = ENTITY_CONFIGS[selectedEntity];
        const suggested = {};

        headers.forEach(header => {
            const normalizedHeader = header.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');

            for (const [pattern, field] of Object.entries(config.suggestedMappings)) {
                const normalizedPattern = pattern.toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');

                if (normalizedHeader === normalizedPattern ||
                    normalizedHeader.includes(normalizedPattern) ||
                    normalizedPattern.includes(normalizedHeader)) {
                    if (!Object.values(suggested).includes(field)) {
                        suggested[header] = field;
                        break;
                    }
                }
            }
        });

        return suggested;
    };

    // Gestion du changement de fichier
    const handleFileChange = async (file) => {
        setUploadedFile(file);
        setImportError(null);

        if (file) {
            setLocalLoading(true);
            try {
                const preview = await parseCSVPreview(file);
                setLocalPreview(preview);

                const suggestedMap = suggestMapping(preview.headers);
                setFieldMapping(suggestedMap);

                if (!importName) {
                    const entityLabel = ENTITY_CONFIGS[selectedEntity]?.label || 'Données';
                    const date = new Date().toLocaleDateString('fr-FR');
                    setImportName(`Import ${entityLabel} - ${date}`);
                }
            } catch (err) {
                console.error('Erreur parsing:', err);
                setImportError(err.message || 'Erreur lors de la lecture du fichier');
            } finally {
                setLocalLoading(false);
            }
        } else {
            setLocalPreview(null);
            setFieldMapping({});
        }
    };

    // Gestion du mapping
    const handleMappingChange = (sourceField, destField) => {
        setFieldMapping(prev => {
            if (destField === '') {
                const newMapping = { ...prev };
                delete newMapping[sourceField];
                return newMapping;
            }
            return { ...prev, [sourceField]: destField };
        });
    };

    // Lancer l'import réel
    const handleStartImport = async () => {
        try {
            setLocalLoading(true);
            setImportError(null);

            // Le backend attend 'excel' et non 'excel_csv'
            const jobData = {
                name: importName,
                source_type: 'excel',
                entity_type: selectedEntity,
                source_file: uploadedFile,
                has_header: hasHeader,
                delimiter: delimiter,
                skip_duplicates: skipDuplicates,
                update_existing: updateExisting,
            };

            const result = await dispatch(createMigrationJob(jobData)).unwrap();

            // Attendre puis prévisualiser
            await new Promise(resolve => setTimeout(resolve, 500));
            await dispatch(previewMigrationData(result.id)).unwrap();

            // Configurer le mapping
            await dispatch(configureMigration({
                id: result.id,
                config: {
                    field_mapping: fieldMapping,
                    skip_duplicates: skipDuplicates,
                    update_existing: updateExisting,
                },
            })).unwrap();

            // Démarrer l'import
            await dispatch(startMigration(result.id)).unwrap();

            setActiveStep(4);
        } catch (err) {
            console.error('Erreur import:', err);
            setImportError(err.message || 'Erreur lors de l\'import');
        } finally {
            setLocalLoading(false);
        }
    };

    // Télécharger un template
    const handleDownloadTemplate = () => {
        if (!selectedEntity) return;

        const config = ENTITY_CONFIGS[selectedEntity];
        const allFields = [...config.fields.required, ...config.fields.optional];
        const headerRow = allFields.map(f => config.fieldLabels[f] || f).join(';');
        const exampleRow = allFields.map(f => config.fields.required.includes(f) ? 'Exemple' : '').join(';');
        const csvContent = '\uFEFF' + headerRow + '\n' + exampleRow;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `template_${selectedEntity}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    // Export des données existantes
    const handleExportData = async (entityType) => {
        try {
            setLocalLoading(true);
            let response;

            switch (entityType) {
                case 'suppliers':
                    response = await suppliersAPI.exportCSV();
                    break;
                default:
                    throw new Error('Type non supporté');
            }

            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `export_${entityType}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Erreur export:', err);
            setImportError('Erreur lors de l\'export');
        } finally {
            setLocalLoading(false);
        }
    };

    // Réinitialiser le wizard
    const resetWizard = () => {
        setActiveStep(0);
        setSelectedEntity(null);
        setUploadedFile(null);
        setImportName('');
        setFieldMapping({});
        setLocalPreview(null);
        setImportError(null);
        dispatch(clearPreview());
    };

    // Vérifier si on peut continuer
    const canProceed = () => {
        switch (activeStep) {
            case 0: return selectedEntity !== null;
            case 1: return uploadedFile !== null && importName.trim() !== '' && localPreview !== null;
            case 2: {
                const config = ENTITY_CONFIGS[selectedEntity];
                return config.fields.required.every(field =>
                    Object.values(fieldMapping).includes(field)
                );
            }
            case 3: return true;
            default: return false;
        }
    };

    const handleNext = () => {
        if (activeStep === 3) {
            handleStartImport();
        } else {
            setActiveStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setActiveStep(prev => prev - 1);
    };

    // Rendu du contenu de chaque étape
    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <Box>
                        <Typography variant="h5" gutterBottom textAlign="center" fontWeight={700}>
                            Quel type de données souhaitez-vous importer ?
                        </Typography>
                        <Typography color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
                            Sélectionnez le type de données pour configurer l'import intelligemment
                        </Typography>

                        <Grid container spacing={3}>
                            {Object.entries(ENTITY_CONFIGS).map(([key, config]) => (
                                <Grid item xs={12} sm={6} md={4} key={key}>
                                    <EntityCard
                                        entityKey={key}
                                        config={config}
                                        selected={selectedEntity === key}
                                        onClick={() => setSelectedEntity(key)}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                );

            case 1:
                return (
                    <Box>
                        <Typography variant="h5" gutterBottom textAlign="center" fontWeight={700}>
                            Sélectionnez votre fichier source
                        </Typography>

                        <Grid container spacing={4}>
                            <Grid item xs={12} md={8}>
                                <FileDropzone
                                    onFileAccepted={handleFileChange}
                                    acceptedFile={uploadedFile}
                                    entityConfig={ENTITY_CONFIGS[selectedEntity]}
                                />
                                {localLoading && <LinearProgress sx={{ mt: 2, borderRadius: 2 }} />}
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <Card sx={{ p: 3, borderRadius: 3 }}>
                                    <Typography variant="h6" gutterBottom fontWeight={600}>
                                        Configuration
                                    </Typography>

                                    <Stack spacing={2.5}>
                                        <TextField
                                            fullWidth
                                            label="Nom de l'import"
                                            value={importName}
                                            onChange={(e) => setImportName(e.target.value)}
                                            required
                                            size="small"
                                        />

                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={hasHeader}
                                                    onChange={(e) => setHasHeader(e.target.checked)}
                                                />
                                            }
                                            label="Première ligne = en-têtes"
                                        />

                                        <FormControl fullWidth size="small">
                                            <InputLabel>Séparateur</InputLabel>
                                            <Select
                                                value={delimiter}
                                                label="Séparateur"
                                                onChange={(e) => {
                                                    setDelimiter(e.target.value);
                                                    if (uploadedFile) handleFileChange(uploadedFile);
                                                }}
                                            >
                                                <MenuItem value=",">Virgule (,)</MenuItem>
                                                <MenuItem value=";">Point-virgule (;)</MenuItem>
                                                <MenuItem value="\t">Tabulation</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <Divider />

                                        <Button
                                            variant="outlined"
                                            startIcon={<Download />}
                                            onClick={handleDownloadTemplate}
                                            fullWidth
                                        >
                                            Télécharger un modèle
                                        </Button>
                                    </Stack>
                                </Card>
                            </Grid>
                        </Grid>
                    </Box>
                );

            case 2:
                const config = ENTITY_CONFIGS[selectedEntity];
                const allDestFields = [...config.fields.required, ...config.fields.optional];
                const mappedRequired = config.fields.required.filter(f => Object.values(fieldMapping).includes(f));

                return (
                    <Box>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
                            <Typography variant="h5" fontWeight={700}>
                                Associez les colonnes
                            </Typography>
                            <Chip
                                icon={<AutoAwesome />}
                                label={`${Object.keys(fieldMapping).length} colonnes mappées`}
                                color="primary"
                            />
                        </Box>

                        <Alert severity={mappedRequired.length === config.fields.required.length ? "success" : "warning"} sx={{ mb: 3, borderRadius: 2 }}>
                            <AlertTitle>Colonnes requises</AlertTitle>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {config.fields.required.map(f => (
                                    <Chip
                                        key={f}
                                        label={config.fieldLabels[f] || f}
                                        size="small"
                                        color={Object.values(fieldMapping).includes(f) ? 'success' : 'error'}
                                        icon={Object.values(fieldMapping).includes(f) ? <CheckCircle /> : undefined}
                                    />
                                ))}
                            </Stack>
                        </Alert>

                        <TableContainer component={Paper} sx={{ borderRadius: 2, maxHeight: 450 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Colonne du fichier</TableCell>
                                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Aperçu</TableCell>
                                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Champ de destination</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {localPreview?.headers.map((header) => (
                                        <TableRow key={header} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {header}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {localPreview.data[0]?.[header] || '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <FormControl fullWidth size="small">
                                                    <Select
                                                        value={fieldMapping[header] || ''}
                                                        onChange={(e) => handleMappingChange(header, e.target.value)}
                                                        displayEmpty
                                                        sx={{ minWidth: 180 }}
                                                    >
                                                        <MenuItem value="">
                                                            <em>— Ignorer —</em>
                                                        </MenuItem>
                                                        {allDestFields.map(field => {
                                                            const isUsed = Object.values(fieldMapping).includes(field) && fieldMapping[header] !== field;
                                                            return (
                                                                <MenuItem
                                                                    key={field}
                                                                    value={field}
                                                                    disabled={isUsed}
                                                                    sx={{
                                                                        color: config.fields.required.includes(field) ? 'error.main' : 'text.primary',
                                                                        fontWeight: config.fields.required.includes(field) ? 600 : 400,
                                                                    }}
                                                                >
                                                                    {config.fieldLabels[field] || field}
                                                                    {config.fields.required.includes(field) && ' *'}
                                                                    {isUsed && ' (utilisé)'}
                                                                </MenuItem>
                                                            );
                                                        })}
                                                    </Select>
                                                </FormControl>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                );

            case 3:
                return (
                    <Box>
                        <Typography variant="h5" gutterBottom fontWeight={700} textAlign="center">
                            Vérifiez et lancez l'import
                        </Typography>

                        <Grid container spacing={3} sx={{ mt: 2 }}>
                            <Grid item xs={12} sm={4}>
                                <Card sx={{ p: 3, textAlign: 'center', borderRadius: 3, background: `${ENTITY_CONFIGS[selectedEntity].color}08` }}>
                                    <Typography variant="h2" color="primary" fontWeight={700}>
                                        {localPreview?.totalRows || 0}
                                    </Typography>
                                    <Typography color="text.secondary">lignes à importer</Typography>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Card sx={{ p: 3, textAlign: 'center', borderRadius: 3, background: '#f0fdf4' }}>
                                    <Typography variant="h2" color="success.main" fontWeight={700}>
                                        {Object.keys(fieldMapping).length}
                                    </Typography>
                                    <Typography color="text.secondary">colonnes mappées</Typography>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Card sx={{ p: 3, textAlign: 'center', borderRadius: 3, background: '#fef3c7' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        {React.createElement(ENTITY_CONFIGS[selectedEntity].icon, { sx: { fontSize: 40, color: ENTITY_CONFIGS[selectedEntity].color } })}
                                    </Box>
                                    <Typography color="text.secondary">{ENTITY_CONFIGS[selectedEntity].label}</Typography>
                                </Card>
                            </Grid>
                        </Grid>

                        <Card sx={{ mt: 4, p: 3, borderRadius: 3 }}>
                            <Typography variant="h6" gutterBottom fontWeight={600}>Options d'import</Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                                <FormControlLabel
                                    control={<Switch checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />}
                                    label="Ignorer les doublons"
                                />
                                <FormControlLabel
                                    control={<Switch checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} disabled={!skipDuplicates} />}
                                    label="Mettre à jour les existants"
                                />
                            </Stack>
                        </Card>

                        <Card sx={{ mt: 3, p: 3, borderRadius: 3 }}>
                            <Typography variant="h6" gutterBottom fontWeight={600}>Aperçu des données</Typography>
                            <TableContainer sx={{ maxHeight: 250 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                                            {Object.entries(fieldMapping).map(([source, dest]) => (
                                                <TableCell key={source} sx={{ fontWeight: 700 }}>
                                                    {ENTITY_CONFIGS[selectedEntity].fieldLabels[dest] || dest}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {localPreview?.data.map((row, index) => (
                                            <TableRow key={index} hover>
                                                <TableCell>{index + 1}</TableCell>
                                                {Object.keys(fieldMapping).map((source) => (
                                                    <TableCell key={source}>{row[source] || '—'}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Card>
                    </Box>
                );

            case 4:
                return (
                    <Box textAlign="center" py={4}>
                        {(currentJob?.status === 'processing' || currentJob?.status === 'pending' || localLoading) && (
                            <Fade in>
                                <Box>
                                    <CircularProgress size={100} thickness={2} sx={{ mb: 3 }} />
                                    <Typography variant="h5" gutterBottom fontWeight={600}>
                                        Import en cours...
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={currentJob?.progress_percentage || 0}
                                        sx={{ mb: 2, height: 10, borderRadius: 5, maxWidth: 400, mx: 'auto' }}
                                    />
                                    <Typography color="text.secondary">
                                        {currentJob?.processed_rows || 0} / {currentJob?.total_rows || localPreview?.totalRows || 0} lignes
                                    </Typography>
                                </Box>
                            </Fade>
                        )}

                        {currentJob?.status === 'completed' && (
                            <Zoom in>
                                <Box>
                                    <CheckCircle sx={{ fontSize: 100, color: '#059669', mb: 2 }} />
                                    <Typography variant="h4" gutterBottom fontWeight={700} color="success.main">
                                        Import terminé !
                                    </Typography>

                                    <Grid container spacing={3} sx={{ mt: 3, maxWidth: 600, mx: 'auto' }}>
                                        <Grid item xs={4}>
                                            <Card sx={{ p: 2, background: '#f0fdf4', borderRadius: 3 }}>
                                                <Typography variant="h3" color="success.main" fontWeight={700}>
                                                    {currentJob.success_count || 0}
                                                </Typography>
                                                <Typography variant="body2">Succès</Typography>
                                            </Card>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Card sx={{ p: 2, background: '#fef2f2', borderRadius: 3 }}>
                                                <Typography variant="h3" color="error.main" fontWeight={700}>
                                                    {currentJob.error_count || 0}
                                                </Typography>
                                                <Typography variant="body2">Erreurs</Typography>
                                            </Card>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Card sx={{ p: 2, background: '#fef3c7', borderRadius: 3 }}>
                                                <Typography variant="h3" color="warning.main" fontWeight={700}>
                                                    {currentJob.skipped_count || 0}
                                                </Typography>
                                                <Typography variant="body2">Ignorés</Typography>
                                            </Card>
                                        </Grid>
                                    </Grid>

                                    <Stack direction="row" spacing={2} justifyContent="center" mt={4}>
                                        <Button variant="contained" startIcon={<Refresh />} onClick={resetWizard}>
                                            Nouvel import
                                        </Button>
                                        <Button variant="outlined" onClick={() => navigate('/migration/jobs')}>
                                            Voir l'historique
                                        </Button>
                                    </Stack>
                                </Box>
                            </Zoom>
                        )}

                        {currentJob?.status === 'failed' && (
                            <Box>
                                <ErrorIcon sx={{ fontSize: 100, color: '#dc2626', mb: 2 }} />
                                <Typography variant="h5" gutterBottom color="error" fontWeight={600}>
                                    Erreur lors de l'import
                                </Typography>
                                <Alert severity="error" sx={{ mt: 2, maxWidth: 500, mx: 'auto', textAlign: 'left' }}>
                                    {currentJob.error_message || 'Une erreur est survenue'}
                                </Alert>
                                <Button variant="contained" startIcon={<Refresh />} onClick={resetWizard} sx={{ mt: 3 }}>
                                    Réessayer
                                </Button>
                            </Box>
                        )}
                    </Box>
                );

            default:
                return null;
        }
    };

    return (
        <Box p={{ xs: 2, md: 4 }}>
            {/* Breadcrumb */}
            <Breadcrumbs sx={{ mb: 3 }}>
                <Link
                    underline="hover"
                    color="inherit"
                    sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                    onClick={() => navigate('/settings')}
                >
                    <Settings fontSize="small" />
                    Paramètres
                </Link>
                <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CloudUpload fontSize="small" />
                    Import de données
                </Typography>
            </Breadcrumbs>

            {/* En-tête */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={4} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>
                        Import intelligent de données
                    </Typography>
                    <Typography color="text.secondary">
                        Importez vos données depuis Excel ou CSV avec mapping automatique
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        startIcon={<History />}
                        onClick={() => navigate('/migration/jobs')}
                    >
                        Historique
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<FileDownload />}
                        onClick={() => handleExportData('suppliers')}
                        disabled={localLoading}
                    >
                        Exporter Fournisseurs
                    </Button>
                </Stack>
            </Box>

            {/* Erreurs */}
            {(importError || error) && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setImportError(null)}>
                    {importError || error}
                </Alert>
            )}

            {/* Card principale */}
            <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
                {/* Stepper */}
                <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <Stepper activeStep={activeStep} alternativeLabel>
                        {STEPS.map((label, index) => (
                            <Step key={label} completed={index < activeStep}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                </Box>

                {/* Contenu */}
                <CardContent sx={{ p: { xs: 2, md: 4 } }}>
                    {renderStepContent()}
                </CardContent>

                {/* Actions */}
                {activeStep < 4 && (
                    <Box sx={{ p: { xs: 2, md: 4 }, pt: 0, display: 'flex', justifyContent: 'space-between' }}>
                        <Button
                            startIcon={<ArrowBack />}
                            onClick={activeStep === 0 ? () => navigate('/settings') : handleBack}
                            disabled={localLoading}
                        >
                            {activeStep === 0 ? 'Retour aux paramètres' : 'Précédent'}
                        </Button>

                        <Button
                            variant="contained"
                            endIcon={activeStep === 3 ? <CloudUpload /> : <ArrowForward />}
                            onClick={handleNext}
                            disabled={!canProceed() || localLoading}
                            sx={{
                                px: 4,
                                background: selectedEntity ? ENTITY_CONFIGS[selectedEntity].gradient : undefined,
                            }}
                        >
                            {localLoading ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : activeStep === 3 ? (
                                'Lancer l\'import'
                            ) : (
                                'Suivant'
                            )}
                        </Button>
                    </Box>
                )}
            </Card>
        </Box>
    );
};

export default DataImportPage;

