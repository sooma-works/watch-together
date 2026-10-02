import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

/** Colores planos para avatares (índice guardado en el perfil). */
export const AVATAR_COLORS = ['#ff6b3d', '#c9b6ff', '#9fd8a8', '#f2d46b', '#86c5ff', '#ff9fc6', '#d6d6d0', '#ffb48a']

const SIZES = { xs: 'size-6 text-[10px]', sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-20 text-3xl' }

export function Avatar({
  profile,
  size = 'sm',
  className,
}: {
  profile: Pick<Profile, 'name' | 'color'>
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      title={profile.name}
      style={{ backgroundColor: AVATAR_COLORS[profile.color % AVATAR_COLORS.length] }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-mono font-semibold text-bg uppercase ring-2 ring-bg',
        SIZES[size],
        className,
      )}
    >
      {profile.name.trim().charAt(0) || '?'}
    </span>
  )
}

export function AvatarStack({ profiles, max = 4, size = 'xs' }: { profiles: Profile[]; max?: number; size?: keyof typeof SIZES }) {
  const shown = profiles.slice(0, max)
  const rest = profiles.length - shown.length
  return (
    <div className="flex -space-x-1.5">
      {shown.map((p) => (
        <Avatar key={p.id} profile={p} size={size} />
      ))}
      {rest > 0 && (
        <span className={cn('inline-flex items-center justify-center rounded-full bg-surface-3 font-mono ring-2 ring-bg', SIZES[size])}>
          +{rest}
        </span>
      )}
    </div>
  )
}
