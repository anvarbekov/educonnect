export default function MessageSkeleton({ count = 6 }) {
  return (
    <div className="space-y-4 p-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className={`flex items-end gap-2 ${i % 3 === 0 ? 'flex-row-reverse' : ''}`}>
          <div className="skeleton-pulse w-8 h-8 rounded-full flex-shrink-0" />
          <div className={`flex flex-col gap-1 max-w-xs ${i % 3 === 0 ? 'items-end' : ''}`}>
            {i % 3 !== 0 && <div className="skeleton-pulse w-20 h-3 rounded" />}
            <div className="skeleton-pulse rounded-2xl" style={{ width: `${120 + Math.random() * 120}px`, height: '40px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
