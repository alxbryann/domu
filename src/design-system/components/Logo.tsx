export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/domu-logo.webp"
        alt="Domu"
        className="h-8 w-auto object-contain"
      />
    </div>
  )
}
