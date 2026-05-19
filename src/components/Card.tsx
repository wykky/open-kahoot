interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white border-4 border-black rounded-2xl p-6 sm:p-8 shadow-xl ${className}`}>
      {children}
    </div>
  );
}
