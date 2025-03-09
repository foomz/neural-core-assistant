import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Brain, Sparkles } from 'lucide-react';
import { AIAssistant } from './components/AIAssistant';
import { Navigation } from './components/Navigation';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';

function Home() {
  return (
    <>
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />

      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#60A5FA" />
          <Suspense fallback={null}>
            <AIAssistant />
          </Suspense>
          <OrbitControls 
            enableZoom={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI * 3/4}
          />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-white">
        <div className="text-center p-8 bg-black/30 rounded-2xl backdrop-blur-xl border border-white/10 shadow-2xl">
          <div className="flex items-center justify-center mb-4 relative">
            <Brain className="w-16 h-16 text-indigo-400" />
            <Sparkles className="w-6 h-6 text-indigo-300 absolute -top-2 -right-2 animate-pulse" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            Neural Core
          </h1>
          <p className="text-lg text-indigo-200 max-w-md">
            Next-generation AI Assistant for Developers with advanced neural processing capabilities
          </p>
          <div className="mt-6 flex gap-4 justify-center">
            <div className="px-4 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 backdrop-blur-sm">
              <div className="text-xs text-indigo-300 mb-1">Neural Processing</div>
              <div className="text-2xl font-semibold text-indigo-400">99.8%</div>
            </div>
            <div className="px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 backdrop-blur-sm">
              <div className="text-xs text-cyan-300 mb-1">Core Stability</div>
              <div className="text-2xl font-semibold text-cyan-400">100%</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-indigo-950 to-gray-900">
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;