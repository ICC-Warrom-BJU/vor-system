import { useMemo } from 'react'
import multiavatar from '@multiavatar/multiavatar'

interface AvatarProps {
  seed: string
  size?: number
  className?: string
}

// Avatar deterministik berbasis Multiavatar (github.com/multiavatar/Multiavatar).
// Seed sama -> avatar sama. Ganti seed untuk mengubah avatar.
export default function Avatar({ seed, size = 40, className = '' }: AvatarProps) {
  const svg = useMemo(() => multiavatar(seed || 'default'), [seed])
  return (
    <div
      className={`inline-block shrink-0 overflow-hidden rounded-full bg-white [&>svg]:h-full [&>svg]:w-full ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
