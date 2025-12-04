import { useEffect, useRef, useState } from 'react';

const MusicPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const startAudio = () => {
      if (audioRef.current && !hasInteracted) {
        // 设置音量为30%（默认最大音量的30%）
        audioRef.current.volume = 0.2;
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setHasInteracted(true);
          })
          .catch((e) => {
            console.log("Autoplay prevented:", e);
          });
      }
    };
    
    // 组件挂载时设置音量，即使自动播放被阻止
    if (audioRef.current) {
      audioRef.current.volume = 0.2;
    };

    // Attempt to play on mount (might be blocked)
    startAudio();

    // Also bind to any click/interaction
    window.addEventListener('click', startAudio, { once: true });
    window.addEventListener('contextmenu', startAudio, { once: true });
    window.addEventListener('touchstart', startAudio, { once: true });
    window.addEventListener('keydown', startAudio, { once: true });

    return () => {
      window.removeEventListener('click', startAudio);
      window.removeEventListener('contextmenu', startAudio);
      window.removeEventListener('touchstart', startAudio);
      window.removeEventListener('keydown', startAudio);
    };
  }, [hasInteracted]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // 确保再次播放时音量仍然是30%
        audioRef.current.volume = 0.2;
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="absolute top-8 right-8 z-50 pointer-events-auto">
      <audio ref={audioRef} src={`${import.meta.env.BASE_URL}bgm.mp3`} loop autoPlay />
      <button 
        onClick={togglePlay}
        className="text-luxury-gold/50 hover:text-luxury-gold transition-colors duration-300 uppercase tracking-widest text-xs border border-luxury-gold/30 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm"
      >
        {isPlaying ? 'Music On' : 'Music Off'}
      </button>
    </div>
  );
};

export default MusicPlayer;
