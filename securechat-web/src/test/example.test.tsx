import React from 'react'
import { render, screen, userEvent } from './render'
import { describe, it, expect } from 'vitest'

const DummyCounter = () => {
  const [count, setCount] = React.useState(0)
  return (
    <div>
      <h1 data-testid="count-header">Count: {count}</h1>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  )
}

describe('React Testing Library Setup', () => {
  it('should correctly render components wrapped in providers', () => {
    render(<DummyCounter />)

    const header = screen.getByTestId('count-header')
    expect(header).toBeInTheDocument()
    expect(header).toHaveTextContent('Count: 0')
  })

  it('should handle user events correctly', async () => {
    const user = userEvent.setup()
    render(<DummyCounter />)

    const button = screen.getByRole('button', { name: /increment/i })

    await user.click(button)

    const header = screen.getByTestId('count-header')
    expect(header).toHaveTextContent('Count: 1')
  })
})