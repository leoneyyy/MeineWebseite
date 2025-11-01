import { useState } from "react";
import { motion } from "framer-motion";
import Window from "./Window";

function App() {
  const [open, setOpen] = useState(null);

  return (
    <>
   <div className="desktop-weiß min-h-screen flex p-8 font-serif flex flex-col">
    {/* Monitor */}
    <div className="bg-desktop-blau flex-grow rounded-lg shadow-lg relative">
      
    <div className="absolute inset-0 p-4 flex flex-col  items-center">
        
        
        <div>
          <motion.h1
    initial={{ opacity: 0, y: -50 }} // Start: Unsichtbar und 50px nach oben verschoben
    animate={{ opacity: 1, y: 0 }}   // Ende: Sichtbar und an der finalen Position
    transition={{ duration: 1 }}className="text-display-font-size leading-tight text-black text-center">
            Herzlich Willkommen <br /> auf meiner<br /> Porfoliseite
          </motion.h1>
        </div>
        

        
        
      </div>
      </div>
  </div>

  <div className="bg-desktop-pink h-[33.33vh] p-4 text-black font-serif leading-tight flex justify-between">
      <h2 className="text-7xl leading-[1.3] text-left">
        Leon Schlender <br />Informatik- <br /> Student
      </h2>
      <p className="text-7xl  text-right">
        Kreativer  Denker <br /> Problemlöser
      </p>
    </div> {/* --- ENDE SEKTION 2 --- */}
    
  </>
  );
}

export default App;
