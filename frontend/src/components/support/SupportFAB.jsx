import React, { useState } from 'react';
import { Fab, Tooltip } from '@mui/material';
import { SupportAgent as SupportIcon } from '@mui/icons-material';
import SupportDialog from './SupportDialog';

export default function SupportFAB() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Tooltip title="Signaler un problème" placement="left">
                <Fab
                    color="primary"
                    onClick={() => setOpen(true)}
                    sx={{
                        position: 'fixed',
                        bottom: { xs: 76, md: 24 },
                        right: 24,
                        zIndex: (theme) => theme.zIndex.drawer + 2,
                    }}
                >
                    <SupportIcon />
                </Fab>
            </Tooltip>
            <SupportDialog open={open} onClose={() => setOpen(false)} />
        </>
    );
}
