import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer id="kontakt" className="bg-[#111111] text-white py-20 px-8 mt-20 rounded-t-[3rem]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
          
         
          <div className="max-w-md">
            <h2 className="text-5xl md:text-7xl font-serif leading-none tracking-tighter mb-6">
              Lust auf ein <br /> <span className="text-gray-500 italic">gemeinsames</span> <br /> Projekt?
            </h2>
            <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">
              Ich bin immer offen für spannende Anfragen.
            </p>
          </div>

          
          <div className="flex flex-col gap-6 items-start md:items-end w-full md:w-auto">
            <a 
              href="mailto:deine-email@beispiel.de" 
              className="text-2xl md:text-4xl font-mono hover:text-gray-400 transition-colors border-b-2 border-white/10 pb-2"
            >
              leonschlender@gmx.de
            </a>
            
            <div className="flex gap-8 mt-4 text-sm font-mono uppercase tracking-widest text-gray-500">
              <a href="https://github.com/leoneyyy" target="_blank" className="hover:text-white transition-colors">GitHub</a>
              <a href="https://www.linkedin.com/in/leon-schlender-897803348" target="_blank" className="hover:text-white transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>

       
        <div className="mt-32 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[0.3em] text-gray-600">
          <p>© 2026 Leon Schlender — Medieninformatik Student</p>
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Nach oben ↑
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;