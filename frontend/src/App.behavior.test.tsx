import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import * as api from './api/api'
import type { Book } from './types'

jest.mock('./api/api', () => ({
  listBooks: jest.fn(), getBook: jest.fn(), listBookCheckouts: jest.fn(),
  createBook: jest.fn(), createCheckout: jest.fn(),
}))

const books: Book[] = [
  { id: 1, title: 'River Stories', genre: 'Fiction', description: 'Stories from the river',
    author: 'Alex Reed', publisher_email: 'books@example.org', shelf_location: 'FIC-1' },
  { id: 2, title: 'Garden Guide', genre: 'Reference', description: 'A gardening handbook',
    author: 'Sam Green', publisher_email: 'books@example.org', shelf_location: 'REF-2' },
]

beforeEach(() => {
  jest.resetAllMocks()
  jest.mocked(api.listBooks).mockResolvedValue(books)
  jest.mocked(api.listBookCheckouts).mockResolvedValue([])
})

test('retries a failed catalog request', async () => {
  jest.mocked(api.listBooks).mockRejectedValueOnce(new Error('Connection lost'))
  const user = userEvent.setup()
  render(<App />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost')
  await user.click(screen.getByRole('button', { name: /retry loading books/i }))
  expect(await screen.findByText('River Stories')).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('keeps all books in the checkout selector while filtering the catalog', async () => {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByText('River Stories')
  await user.type(screen.getByLabelText('Search'), 'River')
  expect(screen.queryByText('Garden Guide', { selector: 'strong' })).not.toBeInTheDocument()
  expect(within(screen.getByLabelText('Book')).getAllByRole('option')).toHaveLength(3)
})

test('ignores an older detail response after selecting another book', async () => {
  let finishFirst!: (book: Book) => void
  jest.mocked(api.getBook).mockImplementation((id) => id === 1
    ? new Promise((resolve) => { finishFirst = resolve })
    : Promise.resolve(books[1]))
  const user = userEvent.setup()
  render(<App />)
  await screen.findByText('River Stories')
  const buttons = screen.getAllByRole('button', { name: 'View Details' })
  await user.click(buttons[0])
  await user.click(buttons[1])
  expect(await screen.findByRole('heading', { name: 'Garden Guide' })).toBeInTheDocument()
  await act(async () => { finishFirst(books[0]) })
  expect(screen.getByRole('heading', { name: 'Garden Guide' })).toBeInTheDocument()
  expect(screen.getByLabelText('Book')).toHaveValue('2')
})

test('keeps a failed checkout draft and prevents a second submission while saving', async () => {
  let failSave!: (reason: Error) => void
  jest.mocked(api.createCheckout).mockImplementation(() => new Promise((_, reject) => { failSave = reject }))
  const user = userEvent.setup()
  render(<App />)
  await screen.findByText('River Stories')
  await user.type(screen.getByLabelText('Patron Name'), 'Taylor')
  await user.selectOptions(screen.getByLabelText('Book'), '1')
  await user.type(screen.getByLabelText('Notes'), 'Pickup Friday')
  await user.click(screen.getByRole('button', { name: 'Create Checkout' }))
  const saving = screen.getByRole('button', { name: 'Saving checkout…' })
  expect(saving).toBeDisabled()
  await user.click(saving)
  expect(api.createCheckout).toHaveBeenCalledTimes(1)
  await act(async () => { failSave(new Error('Please try again')) })
  expect(await screen.findByRole('alert')).toHaveTextContent('Please try again')
  expect(screen.getByLabelText('Patron Name')).toHaveValue('Taylor')
  expect(screen.getByLabelText('Notes')).toHaveValue('Pickup Friday')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create Checkout' })).toBeEnabled())
})
