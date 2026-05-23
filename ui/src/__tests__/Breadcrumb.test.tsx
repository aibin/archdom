import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Breadcrumb } from '../Breadcrumb'
import { BreadcrumbItem } from '../types'

function renderBreadcrumb(items: BreadcrumbItem[]) {
  return render(
    <MemoryRouter>
      <Breadcrumb items={items} />
    </MemoryRouter>
  )
}

describe('Breadcrumb', () => {
  it('renders nothing visible when items is empty', () => {
    const { container } = renderBreadcrumb([])
    expect(container.querySelector('nav')!.textContent).toBe('')
  })

  it('renders a single item as a non-linked active span', () => {
    renderBreadcrumb([{ path: '/', name: 'Root' }])
    const el = screen.getByText('Root')
    expect(el.tagName).toBe('SPAN')
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders intermediate items as links and the last as active span', () => {
    renderBreadcrumb([
      { path: '/', name: 'Root' },
      { path: '/services', name: 'Services' },
    ])
    expect(screen.getByRole('link', { name: 'Root' })).toHaveAttribute('href', '/')
    const last = screen.getByText('Services')
    expect(last.tagName).toBe('SPAN')
    expect(last).not.toHaveAttribute('href')
  })

  it('renders a separator between items', () => {
    renderBreadcrumb([
      { path: '/', name: 'Root' },
      { path: '/services', name: 'Services' },
    ])
    expect(screen.getByText('›')).toBeDefined()
  })

  it('renders one fewer separator than items', () => {
    renderBreadcrumb([
      { path: '/', name: 'Root' },
      { path: '/services', name: 'Services' },
      { path: '/services/auth', name: 'Auth' },
    ])
    expect(screen.getAllByText('›')).toHaveLength(2)
  })

  it('links all items except the last in a deep path', () => {
    renderBreadcrumb([
      { path: '/', name: 'Root' },
      { path: '/services', name: 'Services' },
      { path: '/services/auth', name: 'Auth' },
    ])
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/')
    expect(links[1]).toHaveAttribute('href', '/services')
  })
})
