import { Ban } from 'lucide-react';
import Button from './Button';
import { getGradient } from '@/lib/palette';
import AnimatedIcon from '@/components/AnimatedIcon';

interface ErrorScreenProps {
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  autoRedirect?: {
    url: string;
    delay: number;
    message: string;
  };
}

export default function ErrorScreen({
  title,
  message,
  actionText,
  onAction,
  autoRedirect
}: ErrorScreenProps) {
  return (
    <>
      <div className={`h-dvh overflow-hidden ${getGradient('waiting')} flex items-center justify-center p-4 sm:p-8`}>
        <div className="text-center max-w-md">
          <AnimatedIcon icon={Ban} size="md" iconBgColor="bg-red-200" iconColor="text-red-500" className="mb-3" />
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2 sm:mb-3">
            {title}
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            {message}
          </p>
          <div className="mt-5 sm:mt-6">
            {autoRedirect && (
              <p className="text-gray-500 mb-3 text-sm sm:text-base">{autoRedirect.message}</p>
            )}

            {actionText && onAction && (
              <Button
                onClick={onAction}
                variant="primary"
                size="lg"
              >
                {actionText}
              </Button>
            )}
          </div>
        </div>
      </div>

    </>
  );
}