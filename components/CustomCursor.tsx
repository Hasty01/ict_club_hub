
import React, { useEffect, useRef, useState } from 'react';

export type CursorVariant = 'default' | 'minimal' | 'retro' | 'glow';

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
            followerRef.current.style.transform += ' scale(0.8)';
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
        // Retro cursor snaps faster
        const speed = variant === 'retro' ? 0.4 : 0.2; 
        
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
          default: // 'default'
              return (
                  <>
                    <div 
                        ref={cursorRef}
                        className="fixed top-0 left-0 w-2.5 h-2.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full pointer-events-none z-[9999] -ml-1.5 -mt-1.5 shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                    />
                    <div 
                        ref={followerRef}
                        className={`fixed top-0 left-0 pointer-events-none z-[9998] -ml-5 -mt-5 absolute rounded-full transition-all duration-300 ease-out flex items-center justify-center border-2
                        ${hovering 
                            ? 'w-10 h-10 border-pink-500/80 bg-pink-500/10 dark:border-pink-400/80 dark:bg-pink-400/10 scale-125' 
                            : 'w-10 h-10 border-gray-400/60 dark:border-gray-500/60 scale-75'}`}
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
