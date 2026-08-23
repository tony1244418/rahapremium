'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { MessageCircle, Download, Share2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentRequest {
  id: string;
  packageType: string;
  amount: number;
  phoneNumber: string;
  status: string;
  createdAt: Date | string;
  completedAt?: Date | string;
}

interface WhatsAppButtonProps {
  variant?: 'payment' | 'general';
  paymentId?: string;
  payment?: PaymentRequest;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
}

export default function WhatsAppButton({ 
  variant = 'general', 
  paymentId,
  payment,
  className = '',
  size = 'md',
  iconOnly = false
}: WhatsAppButtonProps) {
  const { t, language } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');

  const adminPhone = '+255657581821';
  
  const getDefaultMessage = () => {
    if (variant === 'payment') {
      return t('paymentIssueMessage');
    }
    return t('generalContactMessage');
  };

  const getButtonText = () => {
    if (variant === 'payment') {
      return t('shareReceipt');
    }
    return t('contactForHelp');
  };

  const getButtonIcon = () => {
    if (variant === 'payment') {
      return <Share2 size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />;
    }
    return <MessageCircle size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />;
  };

  const handleWhatsAppClick = () => {
    const finalMessage = message || getDefaultMessage();
    const encodedMessage = encodeURIComponent(finalMessage);
    const whatsappUrl = `https://wa.me/${adminPhone.replace('+', '')}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    setShowModal(false);
  };

  const handleDownloadReceipt = () => {
    if (!payment) {
      alert('No payment data available for receipt generation');
      return;
    }

    const receiptData = {
      transactionId: payment.id,
      packageType: payment.packageType,
      amount: payment.amount,
      phoneNumber: payment.phoneNumber,
      status: payment.status,
      date: payment.createdAt,
      completedDate: payment.completedAt
    };

    const receiptContent = `
RAHAPREMIUM RECEIPT
==================
Transaction ID: ${receiptData.transactionId}
Package: ${receiptData.packageType}
Amount: TSH ${receiptData.amount.toLocaleString()}
Phone: ${receiptData.phoneNumber}
Status: ${receiptData.status.toUpperCase()}
Date: ${new Date(receiptData.date).toLocaleString()}
${receiptData.completedDate ? `Completed: ${new Date(receiptData.completedDate).toLocaleString()}` : ''}

Thank you for using RahaPremium!
==================
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RahaPremium_Receipt_${payment.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSizeClasses = () => {
    if (iconOnly) {
      switch (size) {
        case 'sm':
          return 'p-3 min-h-[44px] min-w-[44px]';
        case 'lg':
          return 'p-4 min-h-[56px] min-w-[56px]';
        default:
          return 'p-3 min-h-[48px] min-w-[48px]';
      }
    }
    
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm min-h-[44px] min-w-[44px]';
      case 'lg':
        return 'px-6 py-4 text-lg min-h-[56px] min-w-[56px] text-base sm:text-lg';
      default:
        return 'px-4 py-3 text-base min-h-[48px] min-w-[48px]';
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowModal(true)}
        className={`
          ${getSizeClasses()}
          bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
          text-white font-bold rounded-full shadow-2xl hover:shadow-green-500/50
          transition-all duration-300 ease-in-out
          flex items-center justify-center
          ${iconOnly ? '' : 'space-x-2'}
          border-2 border-green-400/20 hover:border-green-300/40
          backdrop-blur-sm
          ${className}
        `}
      >
        {getButtonIcon()}
        {!iconOnly && <span>{getButtonText()}</span>}
      </motion.button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <MessageCircle size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-dark-100">
                      {t('whatsappSupport')}
                    </h3>
                    <p className="text-sm text-dark-400">
                      {adminPhone}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-dark-400 hover:text-dark-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Message Preview */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {language === 'sw' ? 'Ujumbe wa WhatsApp:' : 'WhatsApp Message:'}
                </label>
                <textarea
                  value={message || getDefaultMessage()}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full h-32 p-3 bg-dark-900 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:border-green-500 resize-none"
                  placeholder={getDefaultMessage()}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col space-y-3">
                {variant === 'payment' && (
                  <button
                    onClick={handleDownloadReceipt}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Download size={20} />
                    <span>{t('downloadReceipt')}</span>
                  </button>
                )}
                
                <button
                  onClick={handleWhatsAppClick}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  <MessageCircle size={20} />
                  <span>
                    {language === 'sw' ? 'Fungua WhatsApp' : 'Open WhatsApp'}
                  </span>
                </button>
              </div>

              {/* Footer Note */}
              <div className="mt-4 p-3 bg-dark-900/50 rounded-lg">
                <p className="text-xs text-dark-400 text-center">
                  {language === 'sw' 
                    ? 'Utakuwa na uwezo wa kuhariri ujumbe kabla ya kutumia.' 
                    : 'You can edit the message before sending.'
                  }
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
