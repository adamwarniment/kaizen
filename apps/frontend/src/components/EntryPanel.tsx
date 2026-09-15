import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface EntryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    eyebrow?: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

/** A shared data-entry surface: desktop drawer, mobile bottom sheet. */
const EntryPanel: React.FC<EntryPanelProps> = ({ isOpen, onClose, eyebrow = 'New entry', title, subtitle, children }) => {
    useEffect(() => {
        document.body.classList.toggle('kaizen-panel-open', isOpen);
        return () => document.body.classList.remove('kaizen-panel-open');
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.button
                        aria-label="Close entry panel"
                        onClick={onClose}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 hidden md:block bg-black/25 backdrop-blur-[1px]"
                    />
                    <motion.aside
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 290 }}
                        className="fixed z-50 right-0 bottom-0 w-full md:w-[30rem] h-[min(86vh,46rem)] md:h-screen flex flex-col rounded-t-[2rem] md:rounded-none border border-hairline/10 md:border-y-0 md:border-r-0 bg-surface/[.98] shadow-[-22px_0_70px_rgba(0,0,0,.30)]"
                    >
                        <div className="w-11 h-1 rounded-full bg-raise/15 mx-auto mt-3 md:hidden" />
                        <header className="px-6 md:px-8 pt-5 pb-5 border-b border-hairline/[.08] flex items-start justify-between">
                            <div>
                                <p className="text-[10px] kaizen-eyebrow uppercase tracking-[.22em] font-semibold text-accent mb-1.5">{eyebrow}</p>
                                <h2 className="text-3xl kaizen-serif text-ink-hi">{title}</h2>
                                {subtitle && <p className="text-sm text-ink-mid mt-1.5">{subtitle}</p>}
                            </div>
                            <button onClick={onClose} className="mt-1 p-2 rounded-xl text-ink-low hover:text-ink-hi hover:bg-raise/[.06] transition-colors" aria-label="Close">
                                <X size={20} />
                            </button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">{children}</div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};

export default EntryPanel;
