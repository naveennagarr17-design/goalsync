import { CATEGORY_COLORS } from '../lib/themes';
import type { Category } from '../lib/types';

export default function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="badge">
      <span className="badge-dot" style={{ background: CATEGORY_COLORS[category] }} aria-hidden />
      {category}
    </span>
  );
}
