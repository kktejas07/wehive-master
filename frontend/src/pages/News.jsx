import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Newsroom from '../components/Newsroom';

export default function News() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow pt-24 pb-16">
        <Newsroom />
      </main>
      <Footer />
    </div>
  );
}
