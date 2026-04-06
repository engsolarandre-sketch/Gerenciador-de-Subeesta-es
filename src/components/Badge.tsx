import clsx from 'clsx'

const variants = {
  blue:   'bg-blue-100 text-blue-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  green:  'bg-green-100 text-green-700',
  red:    'bg-red-100 text-red-700',
  gray:   'bg-gray-100 text-gray-500',
}

interface BadgeProps {
  color: keyof typeof variants
  children: React.ReactNode
}

export default function Badge({ color, children }: BadgeProps) {
  return (
    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', variants[color])}>
      {children}
    </span>
  )
}
