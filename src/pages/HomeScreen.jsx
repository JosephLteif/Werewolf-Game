import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import RoleRulesModal from '../components/RoleRulesModal';
import Footer from '../components/Footer';

const HomeScreen = ({ onPlayNow, version }) => {
  const [showRules, setShowRules] = useState(false);

  return (
    <>
      <div className="relative flex flex-col items-center justify-center min-h-screen text-white overflow-hidden via-indigo-950 ">
        <div className="relative z-10 flex flex-col items-center justify-center text-center p-4">
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold" style={{ fontFamily: "'Cinzel', serif" }}>
              NIGHTFALL
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl mt-4 max-w-3xl mx-auto text-gray-300">
              Uncover the truth in a village shrouded in mystery. Can you survive the night?
            </p>
          </motion.div>

          <motion.button
            onClick={onPlayNow}
            className="mt-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-full text-xl md:text-2xl transition-all duration-300 ease-in-out shadow-lg flex items-center group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Play Now
            <ChevronRight className="ml-2 h-6 w-6 transform group-hover:translate-x-1 transition-transform" />
          </motion.button>

          <motion.div
            className="mt-16"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          >
            <button onClick={() => setShowRules(true)} className="text-gray-300 hover:text-white transition-colors text-lg">
              Game Rules
            </button>
          </motion.div>
        </div>
        <Footer version={version} />
      </div>
      {showRules && <RoleRulesModal onClose={() => setShowRules(false)} />}
    </>
  );
};

export default HomeScreen;
