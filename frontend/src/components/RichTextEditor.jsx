import React, { useRef, useEffect, useCallback } from 'react';
import { Box, IconButton, Tooltip, Divider, Paper } from '@mui/material';
import {
    FormatBold,
    FormatItalic,
    FormatUnderlined,
    FormatStrikethrough,
    FormatListBulleted,
    FormatListNumbered,
    OpenInFull,
} from '@mui/icons-material';

const TOOLBAR_ITEMS = [
    { cmd: 'bold', icon: <FormatBold />, title: 'Gras' },
    { cmd: 'italic', icon: <FormatItalic />, title: 'Italique' },
    { cmd: 'underline', icon: <FormatUnderlined />, title: 'Souligné' },
    { cmd: 'strikeThrough', icon: <FormatStrikethrough />, title: 'Barré' },
    'divider',
    { cmd: 'insertUnorderedList', icon: <FormatListBulleted />, title: 'Liste à puces' },
    { cmd: 'insertOrderedList', icon: <FormatListNumbered />, title: 'Liste numérotée' },
];

/**
 * Éditeur de texte enrichi (WYSIWYG) basé sur contentEditable.
 * Stocke le contenu en HTML.
 *
 * Props :
 *   value      : string HTML (valeur contrôlée)
 *   onChange   : (html: string) => void
 *   placeholder: string
 *   disabled   : bool  (affichage lecture seule)
 *   onExpand   : () => void  (si fourni, affiche le bouton Agrandir)
 *   minHeight  : number (px)
 */
const RichTextEditor = ({
    value = '',
    onChange,
    placeholder = '',
    disabled = false,
    onExpand = null,
    minHeight = 80,
}) => {
    const editorRef = useRef(null);

    // Sync externe → DOM uniquement si l'éditeur n'est pas focalisé
    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
        if (document.activeElement === el) return; // L'utilisateur est en train d'écrire
        const html = value || '';
        if (el.innerHTML !== html) {
            el.innerHTML = html;
        }
    }, [value]);

    const execCmd = (cmd) => {
        editorRef.current?.focus();
        // eslint-disable-next-line no-restricted-globals
        document.execCommand(cmd, false, null);
        if (onChange) onChange(editorRef.current?.innerHTML || '');
    };

    const handleInput = useCallback(() => {
        if (onChange) onChange(editorRef.current?.innerHTML || '');
    }, [onChange]);

    return (
        <Paper
            variant="outlined"
            sx={{
                borderColor: disabled ? 'action.disabled' : 'rgba(0,0,0,0.23)',
                '&:hover': !disabled ? { borderColor: 'text.primary' } : {},
                borderRadius: 1,
                overflow: 'hidden',
            }}
        >
            {/* Barre d'outils – masquée en mode lecture */}
            {!disabled && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        px: 0.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'grey.50',
                        flexWrap: 'nowrap',
                    }}
                >
                    {TOOLBAR_ITEMS.map((item, i) =>
                        item === 'divider' ? (
                            <Divider key={i} orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
                        ) : (
                            <Tooltip key={i} title={item.title}>
                                <IconButton
                                    size="small"
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Empêche la perte du focus
                                        execCmd(item.cmd);
                                    }}
                                >
                                    {item.icon}
                                </IconButton>
                            </Tooltip>
                        )
                    )}

                    {/* Bouton Agrandir – à droite */}
                    {onExpand && (
                        <>
                            <Box sx={{ flex: 1 }} />
                            <Tooltip title="Agrandir l'éditeur">
                                <IconButton size="small" onClick={onExpand} color="primary">
                                    <OpenInFull fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </>
                    )}
                </Box>
            )}

            {/* Zone de saisie */}
            <Box
                ref={editorRef}
                contentEditable={!disabled}
                suppressContentEditableWarning
                onInput={handleInput}
                data-placeholder={placeholder}
                sx={{
                    minHeight,
                    p: 1,
                    outline: 'none',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    color: disabled ? 'text.secondary' : 'text.primary',
                    bgcolor: disabled ? 'action.hover' : 'white',
                    cursor: disabled ? 'default' : 'text',
                    userSelect: disabled ? 'text' : undefined,
                    // Style du contenu HTML interne
                    '& ul, & ol': { paddingLeft: '1.5em', margin: '4px 0' },
                    '& li': { marginBottom: '2px' },
                    '& p': { margin: '2px 0' },
                    '& strong': { fontWeight: 700 },
                    '& em': { fontStyle: 'italic' },
                    '& u': { textDecoration: 'underline' },
                    '& s': { textDecoration: 'line-through' },
                    // Placeholder via CSS
                    '&:empty:before': {
                        content: 'attr(data-placeholder)',
                        color: 'text.disabled',
                        pointerEvents: 'none',
                    },
                }}
            />
        </Paper>
    );
};

export default RichTextEditor;
