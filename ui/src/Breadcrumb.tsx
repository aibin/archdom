import { Link } from 'react-router-dom'
import { BreadcrumbItem } from './types'

interface Props {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: Props) {
  return (
    <nav style={styles.nav}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} style={styles.item}>
            {isLast
              ? <span style={styles.active}>{item.name}</span>
              : <Link to={item.path} style={styles.link}>{item.name}</Link>
            }
            {!isLast && <span style={styles.sep}>›</span>}
          </span>
        )
      })}
    </nav>
  )
}

const styles: Record<string, React.CSSProperties> = {
  nav:    { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  item:   { display: 'flex', alignItems: 'center', gap: 4 },
  link:   { color: '#94a3b8', fontSize: 14, textDecoration: 'none', padding: '2px 4px', borderRadius: 4 },
  active: { color: '#e2e8f0', fontSize: 14, fontWeight: 600, padding: '2px 4px' },
  sep:    { color: '#475569', fontSize: 14 },
}
