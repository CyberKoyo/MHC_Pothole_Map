"use client"
import dynamic from 'next/dynamic';
import Footer from './components/footer';
import ReportModal from './components/reportModal';
import { RequestGeolocation } from '@/components/RequestGeolocation';
import Header from './components/header';

// Dynamically import the map so it doesn't break SSR
const MapArea = dynamic(() => import('./components/mapArea'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-500 font-semibold animate-pulse">
      Loading Map...
    </div>
  ),
});

export default function Home() {
  return (
    // h-[100dvh] is crucial for mobile: it accounts for the dynamic browser UI bars (like Safari's address bar)
    <main className="flex flex-col h-[100dvh] w-full overflow-hidden bg-white">
      <Header />
      
      <RequestGeolocation requestOnMount />
      
      {/* Map Section - Takes up all available space */}
      <div className="flex-grow relative w-full h-full">
        <MapArea />
        <ReportModal />
      </div>

      {/* Footer Section */}
      <Footer />
      
    </main>
  );
}