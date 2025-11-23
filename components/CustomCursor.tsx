
import React, { useEffect, useRef, useState } from 'react';

export type CursorVariant = 
  | 'default' 
  | 'minimal' 
  | 'retro' 
  | 'glow' 
  | 'bubble' 
  | 'crosshair' 
  | 'magic' 
  | 'pixel' 
  | 'eclipse' 
  | 'sonar' 
  | 'heart';

const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [variant, setVariant] = useState<CursorVariant>('default');
  
  // Initialize off-screen
  const position = useRef({ x: -100, y: -100 });
  const followerPosition = useRef({ x: -100, y: -100 });

  useEffect(() => {
    // Check storage for saved preference
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('app_cursor') as CursorVariant;
        if (saved) setVariant(saved);
    }

    // Listen for changes from Profile page
    const handleCursorChange = (e: CustomEvent) => {
        if (e.detail) setVariant(e.detail);
    };
    window.addEventListener('cursor-change' as any, handleCursorChange);

    // Only enable on devices with a fine pointer (mouse)
    const mediaQuery = window.matchMedia('(pointer: fine)');
    setIsSupported(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsSupported(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
        mediaQuery.removeEventListener('change', handleChange);
        window.removeEventListener('cursor-change' as any, handleCursorChange);
    };
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!isVisible) setIsVisible(true);
      position.current = { x: e.clientX, y: e.clientY };
      
      const target = e.target as HTMLElement;
      const isInteractive = 
        window.getComputedStyle(target).cursor === 'pointer' ||
        target.matches('a, button, input, select, textarea, [role="button"]') ||
        target.closest('a, button, [role="button"]') !== null;
      
      setHovering(isInteractive);
    };
    
    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);
    const onMouseDown = () => {
        if (followerRef.current) {
            followerRef.current.style.transform += ' scale(0.9)';
        }
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);
    window.addEventListener('mousedown', onMouseDown);

    let animationFrameId: number;

    const animate = () => {
      if (cursorRef.current) {
        // Main dot follows instantly
        cursorRef.current.style.transform = `translate3d(${position.current.x}px, ${position.current.y}px, 0)`;
      }

      if (followerRef.current) {
        // Follower smooth lerp
        // Adjust speed based on variant
        let speed = 0.2;
        if (variant === 'retro' || variant === 'pixel') speed = 0.4;
        if (variant === 'bubble') speed = 0.15;
        if (variant === 'crosshair') speed = 0.3;
        
        followerPosition.current.x += (position.current.x - followerPosition.current.x) * speed;
        followerPosition.current.y += (position.current.y - followerPosition.current.y) * speed;
        
        followerRef.current.style.transform = `translate3d(${followerPosition.current.x}px, ${followerPosition.current.y}px, 0)`;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      window.removeEventListener('mousedown', onMouseDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSupported, isVisible, variant]);

  if (!isSupported) return null;

  // --- Styles based on variant ---

  const renderCursor = () => {
      switch (variant) {
          case 'minimal':
              return (
                  <div 
                    ref={cursorRef}
                    className="fixed top-0 left-0 w-3 h-3 bg-white rounded-full mix-blend-difference pointer-events-none z-[9999] -ml-1.5 -mt-1.5"
                  />
              );
          case 'retro':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-4 h-4 bg-green-500 pointer-events-none z-[9999] -ml-2 -mt-2"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border-2 border-green-500 transition-all duration-100
                        ${hovering ? 'bg-green-500/20 scale-110' : 'scale-100'}`}
                    />
                  </>
              );
          case 'glow':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-4 h-4 bg-blue-400 rounded-full blur-[1px] pointer-events-none z-[9999] -ml-2 -mt-2"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-8 -mt-8 w-16 h-16 rounded-full bg-blue-500/30 blur-xl transition-all duration-500 ease-out
                        ${hovering ? 'scale-150 bg-blue-400/40' : 'scale-100'}`}
                    />
                  </>
              );
          case 'bubble':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-3 h-3 bg-cyan-300 rounded-full pointer-events-none z-[9999] -ml-1.5 -mt-1.5 shadow-[0_0_5px_rgba(103,232,249,0.8)]"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border-2 border-cyan-400/40 bg-cyan-400/10 rounded-full transition-all duration-300 ease-out backdrop-blur-[1px]
                        ${hovering ? 'scale-125 border-cyan-400 bg-cyan-400/20' : 'scale-100'}`}
                    />
                  </>
              );
          case 'crosshair':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-3 -mt-3 flex items-center justify-center w-6 h-6">
                        <div className="absolute w-full h-0.5 bg-red-500 shadow-[0_0_2px_white]"></div>
                        <div className="absolute h-full w-0.5 bg-red-500 shadow-[0_0_2px_white]"></div>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 border border-red-500/50 transition-all duration-200 ease-out
                        ${hovering ? 'scale-75 rotate-45 border-red-500 bg-red-500/10' : 'scale-100'}`}
                    />
                  </>
              );
          case 'magic':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-3 h-3 bg-purple-500 rounded-full pointer-events-none z-[9999] -ml-1.5 -mt-1.5 shadow-[0_0_10px_rgba(168,85,247,0.8)]"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 border-2 border-yellow-400/60 rounded-full transition-all duration-500 ease-out flex items-center justify-center
                        ${hovering ? 'scale-150 rotate-180 border-yellow-300' : 'scale-100'}`}
                    >
                        <div className={`w-full h-full border-2 border-purple-400/30 rounded-full absolute ${hovering ? 'animate-ping' : ''}`}></div>
                    </div>
                  </>
              );
          case 'pixel':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-3 h-3 bg-black dark:bg-white pointer-events-none z-[9999] -ml-1.5 -mt-1.5"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-4 -mt-4 w-8 h-8 border-2 border-dashed border-gray-500 dark:border-gray-400 transition-all duration-150
                        ${hovering ? 'scale-125 bg-gray-500/20 border-solid' : 'scale-100'}`}
                    />
                  </>
              );
          case 'eclipse':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-4 h-4 bg-gray-900 dark:bg-black rounded-full pointer-events-none z-[9999] -ml-2 -mt-2 border border-white/20"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-8 -mt-8 w-16 h-16 rounded-full bg-white/20 blur-md transition-all duration-300 ease-out
                        ${hovering ? 'scale-125 bg-white/40' : 'scale-100'}`}
                    />
                  </>
              );
          case 'sonar':
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-2 h-2 bg-green-400 rounded-full pointer-events-none z-[9999] -ml-1 -mt-1"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border border-green-500/50 rounded-full transition-all duration-300
                        ${hovering ? 'bg-green-500/10' : ''}`}
                    >
                        <div className="absolute inset-0 rounded-full border border-green-500/30 animate-ping"></div>
                    </div>
                  </>
              );
          case 'heart':
              return (
                  <>
                    <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-2.5 -mt-2.5 text-pink-500">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </div>
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-6 -mt-6 w-12 h-12 border border-pink-400/50 rounded-full transition-all duration-300 ease-out
                        ${hovering ? 'scale-150 bg-pink-500/10 border-pink-500' : 'scale-100'}`}
                    />
                  </>
              );
          default: // 'default'
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-2.5 h-2.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full pointer-events-none z-[9999] -ml-1.5 -mt-1.5 shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 w-10 h-10 border-2 rounded-full transition-all duration-300 ease-out flex items-center justify-center
                        ${hovering 
                            ? 'border-pink-500/80 bg-pink-500/10 dark:border-pink-400/80 dark:bg-pink-400/10 scale-125' 
                            : 'border-gray-400/60 dark:border-gray-500/60 scale-75'}`}
                    />
                  </>
              );
      }
  };

  return (
    <>
        {/* Global CSS to hide default cursor only when custom cursor is supported */}
        <style>{`
            @media (pointer: fine) {
                body, a, button, input, textarea, select, [role="button"], .cursor-pointer {
                    cursor: none !important;
                }
            }
        `}</style>
        <div className={`pointer-events-none transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {renderCursor()}
        </div>
    </>
  );
};

export default CustomCursor;
