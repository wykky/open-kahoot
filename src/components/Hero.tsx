interface HeroProps {
  title: string;
  className?: string;
}

export default function Hero({ title, className = "" }: HeroProps) {
  return (
    <div className={`shrink-0 text-center ${className}`}>
      <h1 className="text-3xl sm:text-5xl md:text-7xl text-black font-title py-2 sm:py-4 md:py-6">
        {title}
      </h1>
    </div>
  );
}
