'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface BackButtonProps {
  className?: string;
  text?: string;
}

export const UserBackButton: React.FC<BackButtonProps> = ({
  className = '',
  text = 'Back'
}) => {
  const router = useRouter();
  
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };
  
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleBack}
      className={`inline-flex items-center gap-2 px-4 py-2 text-dark-400 hover:text-dark-100 transition-colors duration-200 ${className}`}
    >
      <ArrowLeft size={20} />
      <span>{text}</span>
    </motion.button>
  );
};
