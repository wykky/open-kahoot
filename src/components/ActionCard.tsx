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
    <Link href={href} className="group">
      <div className="bg-white rounded-2xl p-8 border-4 border-black shadow-xl hover:shadow-2xl hover:bg-yellow-50 transition-all duration-300">
        <div className="text-center">
          {Icon && (
            <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Icon className="w-10 h-10 text-yellow-400" />
            </div>
          )}
          <h2 className="text-3xl text-black mb-4 font-subtitle">{title}</h2>
          <p className="text-gray-600 text-lg mb-6">{description}</p>
          <div className="bg-yellow-400 text-black border-2 border-black py-3 px-6 rounded-lg font-semibold group-hover:bg-black group-hover:text-yellow-400 transition-colors">
            {buttonText}
          </div>
        </div>
      </div>
    </Link>
  );
}
