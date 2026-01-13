import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    TextField,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    InputAdornment,
    Paper
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import laboratoryAPI from '../../../services/laboratoryAPI';

const LabTestCatalog = () => {
    const { t } = useTranslation();

    const [loading, setLoading] = useState(false);
    const [tests, setTests] = useState([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchTests();
    }, [search]);

    const fetchTests = async () => {
        setLoading(true);
        try {
            const data = await laboratoryAPI.getTests({ search });
            setTests(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching tests:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                    Catalogue des Examens
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    sx={{ borderRadius: 2 }}
                >
                    Nouveau Test
                </Button>
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <TextField
                        fullWidth
                        placeholder="Rechercher un examen..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                        size="small"
                    />
                </CardContent>
            </Card>

            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Code</TableCell>
                            <TableCell>Nom</TableCell>
                            <TableCell>Catégorie</TableCell>
                            <TableCell>Prix (XAF)</TableCell>
                            <TableCell>Délai Exécution</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} align="center">Chargement...</TableCell></TableRow>
                        ) : tests.length === 0 ? (
                            <TableRow><TableCell colSpan={6} align="center">Aucun examen trouvé</TableCell></TableRow>
                        ) : (
                            tests.map((test) => (
                                <TableRow key={test.id} hover>
                                    <TableCell>{test.code}</TableCell>
                                    <TableCell fontWeight="bold">{test.name}</TableCell>
                                    <TableCell>
                                        <Chip label={test.category_name} size="small" />
                                    </TableCell>
                                    <TableCell fontWeight="bold">
                                        {new Intl.NumberFormat('fr-FR').format(test.price)}
                                    </TableCell>
                                    <TableCell>{test.turnaround_time_hours}h</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small"><EditIcon /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default LabTestCatalog;
