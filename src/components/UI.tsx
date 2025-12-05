import { useEffect, useState } from 'react';
import { isMobileDevice } from '../utils';

const UI = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const isMobile = isMobileDevice();

  useEffect(() => {
    if (isMobile) {
      setShowTooltip(true);
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 z-10">
      {/* Header - Top Left */}
      <div className="text-left space-y-1 opacity-80 hover:opacity-100 transition-opacity duration-500">
        <h1 className="text-xl md:text-3xl font-serif text-luxury-gold drop-shadow-[0_0_10px_rgba(255,215,0,0.3)] tracking-wider uppercase">
          Merry Christmas
        </h1>
        <h2 className="text-xs md:text-base font-light text-white/70 tracking-widest border-b border-luxury-gold/30 pb-2 inline-block pr-8">
          Xuexue Christmas Tree
        </h2>
      </div>

      {/* Mobile Interaction Tooltip - Center Bottom */}
      {isMobile && (
        <div 
          className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 text-white/80 text-xs transition-opacity duration-1000 ${showTooltip ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="mx-1">👆 旋转</span> | 
          <span className="mx-1">✌️ 缩放</span> | 
          <span className="mx-1">👌 切换</span> | 
          <span className="mx-1">🖖 全屏</span>
        </div>
      )}

      {/* Footer - Bottom Right */}
      <div className="text-right">
        <div className="text-white/30 text-[10px] md:text-xs font-light tracking-widest">
          Jessie L Edition·2025
        </div>
      </div>
    </div>
  );
};

export default UI;
