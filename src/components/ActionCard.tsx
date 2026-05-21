import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  href: string;
  icon?: LucideIcon;
  variant: 'host' | 'join';
  title: string;
  description: string;
  buttonText: string;
}

export default function ActionCard({
  href,
  icon: Icon,
  title,
  description,
  buttonText
}: ActionCardProps) {
  return (
    <Link href={href} className="group block h-full">
      <div className="bg-white rounded-xl p-3 sm:p-6 border-4 border-black shadow-xl group-hover:shadow-2xl group-hover:bg-yellow-50 group-hover:-translate-y-1 group-focus-visible:ring-4 group-focus-visible:ring-yellow-400 transition-all duration-200 h-full flex flex-col">
        <div className="text-center flex-1 flex flex-col items-center justify-center">
          {Icon && (
            <div className="w-12 h-12 sm:w-20 sm:h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4 group-hover:scale-110 transition-transform shrink-0">
              <Icon className="w-6 h-6 sm:w-10 sm:h-10 text-yellow-400" />
            </div>
          )}
          <h2 className="text-xl sm:text-3xl text-black mb-1 sm:mb-3 font-subtitle">{title}</h2>
          <p className="text-gray-600 text-xs sm:text-base mb-2 sm:mb-4 leading-snug">{description}</p>
        </div>
        <div className="bg-yellow-400 text-black border-2 border-black py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold text-sm sm:text-base group-hover:bg-black group-hover:text-yellow-400 transition-colors text-center shrink-0">
          {buttonText}
        </div>
      </div>
    </Link>
  );
}
