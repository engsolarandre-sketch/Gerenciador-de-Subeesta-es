import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export default function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors disabled:opacity-50',
        size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs',
        variant === 'primary' && 'bg-brand text-white hover:bg-brand-dark',
        variant === 'ghost'   && 'text-gray-600 hover:bg-gray-100',
        variant === 'danger'  && 'text-red-600 hover:bg-red-50',
        className
      )}
    >
      {children}
    </button>
  )
}
