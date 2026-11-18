import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './Button.module.scss'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'premium' | 'danger' | 'light'
type Size = 'sm' | 'md' | 'lg'

interface CommonProps {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
  className?: string
  children?: ReactNode
}

type ButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean
    to?: undefined
    href?: undefined
  }

type LinkProps = CommonProps & { to: string; href?: undefined; onClick?: () => void }
type AnchorProps = CommonProps & {
  href: string
  to?: undefined
  download?: boolean | string
  target?: string
  onClick?: () => void
}

function classes({ variant = 'primary', size = 'md', fullWidth, className }: CommonProps) {
  return [styles.button, styles[variant], styles[size], fullWidth && styles.full, className].filter(Boolean).join(' ')
}

export function Button(props: ButtonProps | LinkProps | AnchorProps) {
  const { icon, iconRight, children } = props
  const content = (
    <>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children && <span>{children}</span>}
      {iconRight && <span className={styles.icon}>{iconRight}</span>}
    </>
  )

  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={classes(props)} onClick={props.onClick}>
        {content}
      </Link>
    )
  }

  if (props.href !== undefined) {
    const { href, download, target, onClick } = props as AnchorProps
    return (
      <a
        href={href}
        download={download}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        onClick={onClick}
        className={classes(props)}
      >
        {content}
      </a>
    )
  }

  const {
    variant: _v,
    size: _s,
    icon: _i,
    iconRight: _ir,
    fullWidth: _f,
    className: _c,
    loading,
    disabled,
    type = 'button',
    ...rest
  } = props as ButtonProps
  return (
    <button type={type} className={classes(props)} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading ? <span className={styles.spinner} aria-hidden /> : icon && <span className={styles.icon}>{icon}</span>}
      {children && <span>{children}</span>}
      {!loading && iconRight && <span className={styles.icon}>{iconRight}</span>}
    </button>
  )
}
