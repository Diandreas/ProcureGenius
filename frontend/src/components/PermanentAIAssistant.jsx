import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    IconButton,
    Typography,
    Collapse,
    Grid,
    Card,
    CardActionArea,
    CardContent,
    Avatar,
    Tooltip,
} from '@mui/material';
import {
    Send,
    Close,
    Minimize,
    ExpandMore,
    ExpandLess,
    Receipt,
    ShoppingCart,
    Business,
    Analytics,
    DocumentScanner,
    Inventory,
    People,
    CompareArrows,
    Gavel,
    Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { aiChatAPI } from '../services/api';
import ChatMessage from './AI/ChatMessage';
import ThinkingAnimation from './AI/ThinkingAnimation';
import Mascot from './Mascot';

/**
 * Assistant IA permanent - Toujours visible sans toggle
 * Mascotte en bas à droite qui ouvre le chat au clic
 */
function PermanentAIAssistant({ currentModule = 'dashboard' }) {
    const { enqueueSnackbar } = useSnackbar();
    const messagesEndRef = useRef(null);

    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [quickActions, setQuickActions] = useState([]);
    const [thinkingType, setThinkingType] = useState('typing');

    // Messages de bienvenue contextuels selon le module
    const getWelcomeMessage = () => {
        const messages = {
            dashboard: "Je peux vous aider avec vos statistiques et rapports.",
            suppliers: "Je peux vous aider à gérer vos fournisseurs : créer, rechercher, modifier ou analyser leurs performances.",
            'purchase-orders': "Je peux créer des bons de commande, suivre les livraisons, ou analyser vos achats.",
            invoices: "Je peux créer des factures, suivre les paiements, ou analyser vos revenus.",
            products: "Je peux gérer vos produits, vérifier les stocks et créer des alertes.",
            clients: "Je peux gérer vos clients et analyser leur historique.",
            'e-sourcing': "Je peux vous aider avec les appels d'offres et la comparaison des fournisseurs.",
            contracts: "Je peux analyser vos contrats, extraire les clauses et suivre les expirations.",
        };
        return messages[currentModule] || "Comment puis-je vous aider?";
    };

    // Icônes pour les actions rapides
    const getActionIcon = (actionId) => {
        const icons = {
            create_invoice: <Receipt />,
            create_po: <ShoppingCart />,
            add_supplier: <Business />,
            view_stats: <Analytics />,
            scan_document: <DocumentScanner />,
            add_product: <Inventory />,
            add_client: <People />,
            create_rfq: <CompareArrows />,
            create_contract: <Gavel />,
            generate_report: <DashboardIcon />,
        };
        return icons[actionId] || <Business />;
    };

    useEffect(() => {
        if (isOpen) {
            fetchQuickActions();
        }
    }, [isOpen, currentModule]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchQuickActions = async () => {
        try {
            const response = await aiChatAPI.getQuickActions(currentModule);
            const actions = response.data.actions || response.data || [];
            setQuickActions(actions.slice(0, 6)); // Limiter à 6 actions
        } catch (error) {
            console.error('Error fetching quick actions:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!message.trim()) return;

        const userMessage = {
            role: 'user',
            content: message,
            created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMessage]);
        setMessage('');
        setLoading(true);
        setThinkingType('typing');

        try {
            setThinkingType('analyzing');

            const response = await aiChatAPI.sendMessage({
                message: `[Contexte: ${currentModule}] ${message}`,
                context: { page: currentModule },
            });

            const aiMessage = response.data.message;
            setMessages(prev => [...prev, aiMessage]);

            // Si une action a été exécutée avec succès
            if (response.data.action_result && response.data.action_result.success) {
                setThinkingType('celebration');
                setTimeout(() => {
                    enqueueSnackbar(
                        response.data.action_result.message || 'Action exécutée avec succès',
                        { variant: 'success' }
                    );
                }, 500);
            }
        } catch (error) {
            console.error('Chat error:', error);
            enqueueSnackbar('Erreur lors de l\'envoi du message', { variant: 'error' });
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAction = (action) => {
        const prompt = action.prompt || action.title;
        setMessage(prompt);
        // Auto-envoyer le message
        setTimeout(() => {
            handleSendMessage();
        }, 100);
    };

    const clearChat = () => {
        setMessages([]);
    };

    return (
        <>
            {/* Mascotte flottante toujours visible */}
            {!isOpen && (
                <Tooltip title="Ouvrir l'assistant IA" placement="left">
                    <Box
                        onClick={() => setIsOpen(true)}
                        sx={{
                            position: 'fixed',
                            bottom: 24,
                            right: 24,
                            zIndex: 1000,
                            cursor: 'pointer',
                            '&:hover': {
                                transform: 'scale(1.1)',
                            },
                            transition: 'transform 0.2s',
                            animation: 'float 3s ease-in-out infinite',
                            '@keyframes float': {
                                '0%, 100%': {
                                    transform: 'translateY(0px)',
                                },
                                '50%': {
                                    transform: 'translateY(-10px)',
                                },
                            },
                        }}
                    >
                        <Mascot
                            pose="happy"
                            animation="bounce"
                            size={80}
                        />
                    </Box>
                </Tooltip>
            )}

            {/* Dialog de chat */}
            <Dialog
                open={isOpen}
                onClose={() => setIsOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        height: isMinimized ? 'auto' : '70vh',
                        maxHeight: isMinimized ? 'auto' : '70vh',
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        top: 'auto',
                        left: 'auto',
                        margin: 0,
                    },
                }}
            >
                {/* Header */}
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
                    <Box sx={{ mr: 2 }}>
                        <Mascot
                            pose={loading ? 'thinking' : 'happy'}
                            animation={loading ? 'pulse' : 'none'}
                            size={40}
                        />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">Assistant IA</Typography>
                        <Typography variant="caption" color="text.secondary">
                            Mode {currentModule}
                        </Typography>
                    </Box>
                    <IconButton onClick={() => setIsMinimized(!isMinimized)} size="small">
                        {isMinimized ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                    <IconButton onClick={clearChat} size="small" title="Nouveau chat">
                        <Minimize />
                    </IconButton>
                    <IconButton onClick={() => setIsOpen(false)} size="small">
                        <Close />
                    </IconButton>
                </DialogTitle>

                <Collapse in={!isMinimized}>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 0 }}>
                        {/* Messages */}
                        <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2, py: 1 }}>
                            {messages.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 2 }}>
                                    {/* Mascotte de bienvenue */}
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                                        <Mascot
                                            pose="reading"
                                            animation="float"
                                            size={100}
                                        />
                                    </Box>

                                    <Typography variant="body2" gutterBottom>
                                        {getWelcomeMessage()}
                                    </Typography>

                                    {/* Actions rapides contextuelles */}
                                    {quickActions.length > 0 && (
                                        <Grid container spacing={1} sx={{ mt: 2 }}>
                                            {quickActions.map((action) => (
                                                <Grid item xs={6} key={action.id}>
                                                    <Card sx={{ height: '100%' }}>
                                                        <CardActionArea
                                                            onClick={() => handleQuickAction(action)}
                                                            sx={{ p: 1, height: '100%' }}
                                                        >
                                                            <CardContent sx={{ textAlign: 'center', py: 1, px: 0.5 }}>
                                                                <Avatar sx={{ bgcolor: 'primary.light', mx: 'auto', mb: 1, width: 32, height: 32 }}>
                                                                    {getActionIcon(action.id)}
                                                                </Avatar>
                                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                                                                    {action.title}
                                                                </Typography>
                                                            </CardContent>
                                                        </CardActionArea>
                                                    </Card>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    )}
                                </Box>
                            ) : (
                                <Box>
                                    {messages.map((msg, index) => (
                                        <ChatMessage
                                            key={index}
                                            message={msg}
                                            onQuickAction={handleQuickAction}
                                        />
                                    ))}

                                    {loading && (
                                        <ThinkingAnimation
                                            type={thinkingType}
                                            duration={0}
                                        />
                                    )}

                                    <div ref={messagesEndRef} />
                                </Box>
                            )}
                        </Box>

                        {/* Input zone */}
                        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <TextField
                                fullWidth
                                size="small"
                                multiline
                                maxRows={3}
                                placeholder="Tapez votre message..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                disabled={loading}
                                InputProps={{
                                    endAdornment: (
                                        <IconButton
                                            onClick={handleSendMessage}
                                            disabled={loading || !message.trim()}
                                            color="primary"
                                            size="small"
                                        >
                                            <Send fontSize="small" />
                                        </IconButton>
                                    ),
                                }}
                            />
                        </Box>
                    </DialogContent>
                </Collapse>
            </Dialog>
        </>
    );
}

export default PermanentAIAssistant;

