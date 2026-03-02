import { useState } from "react";
import { motion } from "framer-motion";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import "./App.css";
import { TextHoverEffect } from "./components/ui/text-hover-effect";
import { EncryptedText } from "./components/ui/encrypted-text";
import React from "react";
import { PixelatedCanvas } from "./components/ui/pixelated-canvas";
import { FocusCards } from "./components/ui/focus-cards";
import sdsImage from "./sds (2).png";
import inviteImage from "./solarsystem.png";
import { CometCard } from "./components/ui/comet-card";
import { LampContainer } from "./components/ui/lamp";
import { TypewriterEffectSmooth } from "./components/ui/typewritter-effect";
import eventmateImage from "./eventmate.png";


function App() {

  const [open, setOpen] = useState(null);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">


      <div className="fixed inset-0 -z-10">
        <ShaderGradientCanvas>
          <ShaderGradient
            animate="on"
            axesHelper="off"
            brightness={1.2}
            cAzimuthAngle={180}
            cDistance={3.6}
            cPolarAngle={90}
            cameraZoom={1}
            color1="#1b0000"
            color2="#87007e"
            color3="#000034"
            destination="onCanvas"
            embedMode="off"
            envPreset="city"
            format="gif"
            fov={45}
            frameRate={10}
            gizmoHelper="hide"
            grain="on"
            lightType="3d"
            pixelDensity={1}
            positionX={-1.4}
            positionY={0}
            positionZ={0}
            range="disabled"
            rangeEnd={40}
            rangeStart={0}
            reflection={0.1}
            rotationX={0}
            rotationY={10}
            rotationZ={50}
            shader="defaults"
            type="plane"
            uAmplitude={1}
            uDensity={1.3}
            uFrequency={5.5}
            uSpeed={0.4}
            uStrength={4}
            uTime={0}
            wireframe={false}
          />
        </ShaderGradientCanvas>
      </div>

      {/* 2. Content Layer */}
      <main className="relative z-10">

        {/* Sektion 1: Hero / Monitor */}
        <section className="min-h-screen flex flex-col p-8 md:p-12 font-serif">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 flex-grow rounded-3xl shadow-2xl relative flex items-center justify-center">
            <div className="h-[20rem] md:h-[60rem] flex items-center justify-center"><TextHoverEffect text="Hallo" duration={0.5} /></div>
          </div>
        </section>

        {/* Sektion 2: Info */}
        <section className="bg-white/80 backdrop-blur-lg min-h-[50vh] p-8 md:p-16 text-black font-serif flex flex-col md:flex-row items-center justify-between">
          <h2 className="text-4xl md:text-6xl font-medium leading-tight">
            <EncryptedText text="Ich bin " className="inline-block" revealDelayMs={125} /> <br />
            <EncryptedText text="Leon Schlender" className="inline-block" revealDelayMs={150} revealedClassName="text-pink-700" /> <br />
            <EncryptedText text="Informatik-Student" className="inline-block" revealedClassName="text-gray-600" revealDelayMs={175} />
          </h2>

          <div className="w-full md:w-fit flex justify-center mt-4 md:mt-0">
            <div className="max-w-full overflow-hidden flex justify-center">
              <PixelatedCanvas
                src={sdsImage}
                width={400}
                height={500}
                cellSize={3}
                dotScale={0.9}
                shape="square"
                backgroundColor="#000000"
                dropoutStrength={0.4}
                interactive
                distortionStrength={3}
                distortionRadius={80}
                distortionMode="swirl"
                followSpeed={0.2}
                jitterStrength={4}
                jitterSpeed={4}
                sampleAverage
                tintColor="#FFFFFF"
                tintStrength={0.2}
                className="rounded-xl border border-neutral-800 shadow-lg"
              />
            </div>
          </div>
        </section>

        <section className="p-8 md:p-20">

          <TypewriterEffectSmooth
            words={[
              { text: "Meine Projekte", className: "bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent" },
            ]}

          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 items-start">

            <CometCard rotateDepth={15} translateDepth={20} className="w-full">
              <a href="https://github.com/leoneyyy/Sonnensystem" target="_blank" rel="noreferrer" className="block">
                <div className="flex w-full flex-col rounded-[16px] bg-[#1F2121] p-4 text-white font-mono">
                  <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-black">
                    <img
                      src={inviteImage}
                      className="h-full w-full object-cover saturate-0 hover:saturate-100 transition-all duration-500"
                      alt="Solar System"
                    />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg">Solar System 3D</h3>
                    <p className="text-xs text-gray-500">JavaFX / Physics</p>
                  </div>
                </div>
              </a>
            </CometCard>

            <CometCard rotateDepth={15} translateDepth={20} className="w-full">
              <a href="https://github.com/leoneyyy/Eventmate" target="_blank" rel="noreferrer" className="block">
                <div className="flex w-full flex-col rounded-[16px] bg-[#1F2121] p-4 text-white font-mono border border-white/5 hover:border-orange-500 transition-colors">
                  <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-black flex items-center justify-center">
                    <img
                      src={eventmateImage}
                      className="h-full w-full object-cover saturate-0 hover:saturate-100 transition-all duration-500"
                      alt="La La Land"
                    />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg text-orange-400">Eventmate</h3>
                    <p className="text-xs text-gray-500">Java / Android</p>
                  </div>
                </div>
              </a>
            </CometCard>

            <CometCard rotateDepth={15} translateDepth={20} className="w-full">
              <div className="flex w-full flex-col rounded-[16px] bg-[#1F2121] p-4 text-white font-mono opacity-50 border-2 border-dashed border-white/10">
                <div className="aspect-[4/5] w-full flex items-center justify-center rounded-lg">
                  <span className="text-sm">Coming Soon</span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg">MovieDB</h3>
                  <p className="text-xs text-gray-500">JavaFx / RestAPI / SQL / Jackson</p>
                </div>
              </div>
            </CometCard>

          </div>
        </section>

      </main>
    </div>
  );
}

export default App;