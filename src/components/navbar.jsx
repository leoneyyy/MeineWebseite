import { motion } from "framer-motion";

const Navbar = () => {
  const socialLinks = [
    {
      name: "GitHub",
      url: "https://github.com/leoneyyy",
      icon: (
        <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
      ),
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/in/leon-schlender-897803348",
      icon: (
        <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
      ),
    },
  ];

  // Zentrale Funktion für sanftes Scrollen
  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 100; // Platz für die Navbar lassen
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="fixed top-0 left-0 w-full z-[100] px-4 py-4 md:px-10"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-3 rounded-3xl shadow-2xl">
        
        {/* Logo scrollt nach ganz oben */}
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="text-white font-serif text-xl font-bold tracking-tighter cursor-pointer"
        >
          Leon<span className="opacity-40">.Schlender</span>
        </div>

        <div className="hidden lg:flex items-center gap-10">
          {["Projekte", "Kontakt"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={(e) => scrollToSection(e, item.toLowerCase())}
              className="text-[11px] uppercase tracking-[0.2em] text-white/60 hover:text-white transition-all font-medium"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3 border-r border-white/10 pr-5">
            {socialLinks.map((link) => (
              <motion.a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                whileHover={{ y: -3, scale: 1.1 }}
                className="text-white/50 hover:text-white transition-colors"
              >
                {link.icon}
              </motion.a>
            ))}
          </div>

          <motion.button
            onClick={(e) => scrollToSection(e, "kontakt")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white/10 text-white px-6 py-2.5 rounded-2xl text-[10px] uppercase tracking-widest font-bold shadow-lg shadow-white/10"
          >
            Sprechen wir
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;