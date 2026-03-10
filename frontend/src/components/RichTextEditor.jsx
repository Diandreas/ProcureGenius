import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Box, IconButton, Tooltip, Divider, Paper, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography } from '@mui/material';
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
    TableChart,
    ContentPaste,
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

// Clean Word/LibreOffice paste — keep structure, strip junk styles
function cleanWordHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;

    // Remove Word-specific tags entirely
    div.querySelectorAll('o\\:p, w\\:sdt, w\\:sdtContent, xml, style, script, meta').forEach(el => el.remove());

    // Clean all elements: strip class/id/lang, keep only border/width on td/th
    div.querySelectorAll('*').forEach(el => {
        el.removeAttribute('class');
        el.removeAttribute('id');
        el.removeAttribute('lang');
        el.removeAttribute('xml:lang');

        const tag = el.tagName.toLowerCase();
        if (tag === 'td' || tag === 'th') {
            // Keep colspan/rowspan, border from inline style
            const style = el.getAttribute('style') || '';
            const border = style.match(/border[^;]*/g) || [];
            const width = style.match(/width[^;]*/g) || [];
            const bg = style.match(/background[^;]*/g) || [];
            const align = style.match(/text-align[^;]*/g) || [];
            const kept = [...border, ...width, ...bg, ...align].join(';');
            if (kept) el.setAttribute('style', kept);
            else el.removeAttribute('style');
        } else if (tag === 'table') {
            el.setAttribute('style', 'border-collapse:collapse;width:100%;margin:8px 0;');
            el.removeAttribute('class');
        } else if (tag === 'span') {
            // Keep bold/italic via span style if present, else unwrap
            const style = el.getAttribute('style') || '';
            if (style.includes('font-weight') || style.includes('font-style') || style.includes('color')) {
                const kept = (style.match(/(font-weight|font-style|color)[^;]*/g) || []).join(';');
                if (kept) el.setAttribute('style', kept);
                else el.removeAttribute('style');
            } else {
                el.removeAttribute('style');
            }
        } else {
            el.removeAttribute('style');
        }
    });

    // Remove empty paragraphs left by Word
    div.querySelectorAll('p').forEach(p => {
        if (!p.textContent.trim() && !p.querySelector('img,table')) p.remove();
    });

    return div.innerHTML;
}

// Insert a blank table at cursor
function insertTable(rows, cols) {
    const borderStyle = 'border:1px solid #9ca3af;padding:6px 10px;';
    let html = `<table style="border-collapse:collapse;width:100%;margin:8px 0;">`;
    // Header row
    html += '<thead><tr>';
    for (let c = 0; c < cols; c++) {
        html += `<th style="${borderStyle}background:#f3f4f6;font-weight:600;">En-tête ${c + 1}</th>`;
    }
    html += '</tr></thead><tbody>';
    for (let r = 0; r < rows - 1; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) {
            html += `<td style="${borderStyle}"> </td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table><p></p>';
    document.execCommand('insertHTML', false, html);
}

const RichTextEditor = ({
    value = '',
    onChange,
    placeholder = '',
    disabled = false,
    onExpand = null,
    minHeight = 80,
    simple = false,
    withTable = false, // Enable table toolbar
}) => {
    const editorRef = useRef(null);
    const [sizeAnchor, setSizeAnchor] = useState(null);
    const [colorAnchor, setColorAnchor] = useState(null);
    const [tableDialog, setTableDialog] = useState(false);
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);

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

    // Handle paste: intercept and clean Word HTML
    const handlePaste = useCallback((e) => {
        e.preventDefault();
        const clipData = e.clipboardData;
        // Prefer HTML over plain text to preserve tables
        let html = clipData.getData('text/html');
        if (html) {
            const cleaned = cleanWordHtml(html);
            document.execCommand('insertHTML', false, cleaned);
        } else {
            const text = clipData.getData('text/plain');
            document.execCommand('insertText', false, text);
        }
        if (onChange) onChange(editorRef.current?.innerHTML || '');
    }, [onChange]);

    const handleInsertTable = () => {
        editorRef.current?.focus();
        insertTable(Number(tableRows), Number(tableCols));
        if (onChange) onChange(editorRef.current?.innerHTML || '');
        setTableDialog(false);
    };

    const toolbar = simple ? BASIC_TOOLBAR : FULL_TOOLBAR;

    return (
        <>
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

                    {withTable && !simple && (
                        <>
                            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
                            <Tooltip title="Insérer un tableau">
                                <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); setTableDialog(true); }} color="primary">
                                    <TableChart fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Coller depuis Word/Excel (Ctrl+V)">
                                <IconButton size="small" color="secondary" onClick={() => editorRef.current?.focus()}>
                                    <ContentPaste fontSize="small" />
                                </IconButton>
                            </Tooltip>
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
                onPaste={handlePaste}
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
                    // Table styles
                    '& table': { borderCollapse: 'collapse', width: '100%', margin: '8px 0' },
                    '& td, & th': { border: '1px solid #9ca3af', padding: '6px 10px', minWidth: 60 },
                    '& th': { bgcolor: '#f3f4f6', fontWeight: 600 },
                    '& tr:nth-of-type(even) td': { bgcolor: '#fafafa' },
                }}
            />
        </Paper>

        {/* Table insertion dialog */}
        <Dialog open={tableDialog} onClose={() => setTableDialog(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Insérer un tableau</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Vous pouvez aussi coller directement un tableau depuis Word ou Excel avec <strong>Ctrl+V</strong>.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        label="Lignes"
                        type="number"
                        size="small"
                        value={tableRows}
                        onChange={e => setTableRows(Math.max(1, Number(e.target.value)))}
                        inputProps={{ min: 1, max: 20 }}
                        fullWidth
                    />
                    <TextField
                        label="Colonnes"
                        type="number"
                        size="small"
                        value={tableCols}
                        onChange={e => setTableCols(Math.max(1, Number(e.target.value)))}
                        inputProps={{ min: 1, max: 10 }}
                        fullWidth
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setTableDialog(false)}>Annuler</Button>
                <Button variant="contained" onClick={handleInsertTable} startIcon={<TableChart />}>Insérer</Button>
            </DialogActions>
        </Dialog>
        </>
    );
};

export default RichTextEditor;
