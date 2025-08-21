interface SpriteProps {
  src: string;
  isAnimating: boolean;
  animation: 'attack' | 'hit' | 'idle';
  flip?: boolean;
}

export function Sprite({ src, isAnimating, animation, flip }: SpriteProps) {
  return (
    <div
      className={`
        w-32 h-32 
        ${isAnimating ? animation : ''}
        ${flip ? 'scale-x-[-1]' : ''}
      `}
    >
      <img src={src} alt="character sprite" className="w-full h-full object-contain" />
    </div>
  );
}
