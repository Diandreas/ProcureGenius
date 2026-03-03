import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Box, IconButton, Tooltip, Divider, Paper, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import {
    FormatBold,
    FormatItalic,
    FormatUnderlined,
    FormatStrikethrough,
    FormatListBulleted,
    FormatListNumbered,
    OpenInFull,
    FormatAlignLeft,
    FormatAlignCenter,
    FormatAlignRight,
    FormatAlignJustify,
    FormatIndentIncrease,
    FormatIndentDecrease,
    FormatSize,
    Palette,
} from '@mui/icons-material';

const BASIC_TOOLBAR = [
    { cmd: 'bold', icon: <FormatBold />, title: 'Gras' },
    { cmd: 'italic', icon: <FormatItalic />, title: 'Italique' },
    { cmd: 'underline', icon: <FormatUnderlined />, title: 'Souligné' },
    'divider',
    { cmd: 'insertUnorderedList', icon: <FormatListBulleted />, title: 'Liste à puces' },
];

const FULL_TOOLBAR = [
    { cmd: 'bold', icon: <FormatBold />, title: 'Gras' },
    { cmd: 'italic', icon: <FormatItalic />, title: 'Italique' },
    { cmd: 'underline', icon: <FormatUnderlined />, title: 'Souligné' },
    { cmd: 'strikeThrough', icon: <FormatStrikethrough />, title: 'Barré' },
    'divider',
    { cmd: 'justifyLeft', icon: <FormatAlignLeft />, title: 'Aligner à gauche' },
    { cmd: 'justifyCenter', icon: <FormatAlignCenter />, title: 'Centrer' },
    { cmd: 'justifyRight', icon: <FormatAlignRight />, title: 'Aligner à droite' },
    { cmd: 'justifyFull', icon: <FormatAlignJustify />, title: 'Justifier' },
    'divider',
    { cmd: 'insertUnorderedList', icon: <FormatListBulleted />, title: 'Liste à puces' },
    { cmd: 'insertOrderedList', icon: <FormatListNumbered />, title: 'Liste numérotée' },
    'divider',
    { cmd: 'outdent', icon: <FormatIndentDecrease />, title: 'Diminuer le retrait' },
    { cmd: 'indent', icon: <FormatIndentIncrease />, title: 'Augmenter le retrait' },
];

const FONT_SIZES = [
    { label: 'Petit', value: '1' },
    { label: 'Normal', value: '3' },
    { label: 'Moyen', value: '4' },
    { label: 'Grand', value: '5' },
    { label: 'Très grand', value: '6' },
];

const COLORS = [
    { label: 'Noir', value: '#000000' },
    { label: 'Gris', value: '#666666' },
    { label: 'Rouge', value: '#d32f2f' },
    { label: 'Bleu', value: '#1976d2' },
    { label: 'Vert', value: '#2e7d32' },
];

const RichTextEditor = ({
    value = '',
    onChange,
    placeholder = '',
    disabled = false,
    onExpand = null,
    minHeight = 80,
    simple = false, // Nouveau paramètre
}) => {
    const editorRef = useRef(null);
    const [sizeAnchor, setSizeAnchor] = useState(null);
    const [colorAnchor, setColorAnchor] = useState(null);

    useEffect(() => {
        const el = editorRef.current;
        if (!el || document.activeElement === el) return;
        const html = value || '';
        if (el.innerHTML !== html) el.innerHTML = html;
    }, [value]);

    const execCmd = (cmd, val = null) => {
        editorRef.current?.focus();
        document.execCommand(cmd, false, val);
        if (onChange) onChange(editorRef.current?.innerHTML || '');
    };

    const handleInput = useCallback(() => {
        if (onChange) onChange(editorRef.current?.innerHTML || '');
    }, [onChange]);

    const toolbar = simple ? BASIC_TOOLBAR : FULL_TOOLBAR;

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
            {!disabled && (
                <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50', flexWrap: 'wrap' }}>
                    {toolbar.map((item, i) =>
                        item === 'divider' ? (
                            <Divider key={i} orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
                        ) : (
                            <Tooltip key={i} title={item.title}>
                                <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); execCmd(item.cmd); }}>
                                    {item.icon}
                                </IconButton>
                            </Tooltip>
                        )
                    )}

                    {!simple && (
                        <>
                            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
                            <Tooltip title="Taille">
                                <IconButton size="small" onClick={(e) => setSizeAnchor(e.currentTarget)}><FormatSize fontSize="small" /></IconButton>
                            </Tooltip>
                            <Menu anchorEl={sizeAnchor} open={Boolean(sizeAnchor)} onClose={() => setSizeAnchor(null)}>
                                {FONT_SIZES.map((s) => (
                                    <MenuItem key={s.value} onClick={() => { execCmd('fontSize', s.value); setSizeAnchor(null); }}>
                                        <ListItemText primary={s.label} />
                                    </MenuItem>
                                ))}
                            </Menu>

                            <Tooltip title="Couleur">
                                <IconButton size="small" onClick={(e) => setColorAnchor(e.currentTarget)}><Palette fontSize="small" /></IconButton>
                            </Tooltip>
                            <Menu anchorEl={colorAnchor} open={Boolean(colorAnchor)} onClose={() => setColorAnchor(null)}>
                                {COLORS.map((c) => (
                                    <MenuItem key={c.value} onClick={() => { execCmd('foreColor', c.value); setColorAnchor(null); }}>
                                        <ListItemIcon><Box sx={{ width: 16, height: 16, bgcolor: c.value, borderRadius: '50%', border: '1px solid #ddd' }} /></ListItemIcon>
                                        <ListItemText primary={c.label} />
                                    </MenuItem>
                                ))}
                            </Menu>
                        </>
                    )}

                    {onExpand && (
                        <>
                            <Box sx={{ flex: 1 }} />
                            <Tooltip title="Agrandir">
                                <IconButton size="small" onClick={onExpand} color="primary"><OpenInFull fontSize="small" /></IconButton>
                            </Tooltip>
                        </>
                    )}
                </Box>
            )}

            <Box
                ref={editorRef}
                contentEditable={!disabled}
                suppressContentEditableWarning
                onInput={handleInput}
                data-placeholder={placeholder}
                sx={{
                    minHeight, p: 2, outline: 'none', fontSize: '1rem', lineHeight: 1.6,
                    color: disabled ? 'text.secondary' : 'text.primary',
                    bgcolor: disabled ? 'action.hover' : 'white',
                    cursor: disabled ? 'default' : 'text',
                    '& ul, & ol': { paddingLeft: '2em', margin: '8px 0' },
                    '& p': { margin: '4px 0', minHeight: '1em' },
                    '& strong': { fontWeight: 700 },
                    '&:empty:before': { content: 'attr(data-placeholder)', color: 'text.disabled', pointerEvents: 'none' },
                }}
            />
        </Paper>
    );
};

export default RichTextEditor;
