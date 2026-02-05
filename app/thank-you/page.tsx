import { Suspense } from 'react';
import ThankYouContent from './ThankYouContent';

export default function ThankYouPage() {
  return (
    <Suspense>
      <ThankYouContent />
    </Suspense>
  );
}