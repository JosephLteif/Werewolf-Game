import React from 'react';

const Footer = ({ version }) => {
  return (
    <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-500">
      <p>&copy; {new Date().getFullYear()} Nightfall. All Rights Reserved. | Version: {version}</p>
    </div>
  );
};

export default Footer;
