'use client';

import Image from 'next/image';

export default function TestImagesPage() {
  return (
    <div className="min-h-screen bg-dark-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Image Test Page - Auto Deploy Test</h1>
        
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-dark-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">M-Pesa</h2>
            <div className="bg-white p-4 rounded">
              <Image 
                src="/m-pesa.png" 
                alt="M-Pesa" 
                width={120}
                height={48}
                className="max-h-12 max-w-full object-contain" 
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">URL: /m-pesa.png</p>
          </div>

          <div className="bg-dark-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Airtel Money</h2>
            <div className="bg-white p-4 rounded">
              <Image 
                src="/airtel-money.png" 
                alt="Airtel Money" 
                width={120}
                height={48}
                className="max-h-12 max-w-full object-contain" 
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">URL: /airtel-money.png</p>
          </div>

          <div className="bg-dark-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">HaloPesa</h2>
            <div className="bg-white p-4 rounded">
              <Image 
                src="/halopesa.png" 
                alt="HaloPesa" 
                width={120}
                height={48}
                className="max-h-12 max-w-full object-contain" 
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">URL: /halopesa.png</p>
          </div>

          <div className="bg-dark-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Mixx by Yas</h2>
            <div className="bg-white p-4 rounded">
              <Image 
                src="/mixx-by-yas.png" 
                alt="Mixx by Yas" 
                width={120}
                height={48}
                className="max-h-12 max-w-full object-contain" 
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">URL: /mixx-by-yas.png</p>
          </div>
        </div>

        <div className="mt-8 bg-dark-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Direct Image Links (for testing)</h2>
          <div className="space-y-2 text-sm">
            <p><a href="/m-pesa.png" target="_blank" className="text-blue-400 hover:underline">/m-pesa.png</a></p>
            <p><a href="/airtel-money.png" target="_blank" className="text-blue-400 hover:underline">/airtel-money.png</a></p>
            <p><a href="/halopesa.png" target="_blank" className="text-blue-400 hover:underline">/halopesa.png</a></p>
            <p><a href="/mixx-by-yas.png" target="_blank" className="text-blue-400 hover:underline">/mixx-by-yas.png</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
