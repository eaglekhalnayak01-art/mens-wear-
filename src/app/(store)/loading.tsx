/**
 * Route-level loading state for the storefront. It is a shape of the page rather
 * than a spinner: the eye reads a grid appearing as "fast", while a centred
 * spinner reads as "waiting".
 */
export default function StoreLoading() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-10 sm:px-6 sm:py-14" role="status" aria-live="polite">
      <span className="sr-only">Loading the shop</span>
      <div className="skeleton h-5 w-[132px] rounded-full" />
      <div className="skeleton mt-4 h-9 w-[min(420px,80%)] rounded-[var(--radius-sm)]" />
      <div className="skeleton mt-3 h-4 w-[min(520px,90%)] rounded-full" />
      <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index}>
            <div className="skeleton aspect-4/5 w-full rounded-[var(--radius-sm)]" />
            <div className="skeleton mt-3 h-3.5 w-[85%] rounded-full" />
            <div className="skeleton mt-2 h-3.5 w-[42%] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
