
import { redirect } from 'next/navigation';

/**
 * نقطة البداية السيادية - التوجيه اللحظي للميديا
 * تم الضبط لتبدأ الرحلة من الميديا مع بقاء الداشبورد متاحاً.
 */
export default function Home() {
  redirect('/media');
}
