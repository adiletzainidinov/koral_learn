import type { Metadata } from 'next';
import { ReviewsList } from '@/widgets/reviews-list';

export const metadata: Metadata = { title: 'Проверка заданий' };

export default function ReviewsPage() {
  return <ReviewsList />;
}
