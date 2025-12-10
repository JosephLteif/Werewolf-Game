import React from 'react';

const Footer = ({ version, showSupportButton }) => {
  return (
    <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-500">
      <p>&copy; {new Date().getFullYear()} Nightfall. All Rights Reserved. | Version: {version}</p>
      {showSupportButton && (
        <div className="fixed bottom-4 left-4 z-50 p-2">
          <a
            href="https://nowpayments.io/donation/Wrekt001"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            Support me 🐺
          </a>
        </div>
      )}
    </div>
  );
}

export default Footer;
