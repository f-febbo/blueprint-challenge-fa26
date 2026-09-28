import { useEffect, useRef, useState } from 'react'
import './App.css'
import * as api from './api/api'
import CheckoutForm from './components/CheckoutForm'
import BookDetail from './components/BookDetail'
import BookForm from './components/BookForm'
import BookList from './components/BookList'
import { GENRES, type Genre, type Checkout, type CheckoutFormValues, type Book, type BookFormValues } from './types'

const initialBookForm: BookFormValues = {
  title: '', genre: 'Fiction', description: '', author: '', publisher_email: '', shelf_location: '',
}

function newCheckoutForm(bookId = ''): CheckoutFormValues {
  const today = new Date()
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return { patron_name: '', book_id: bookId, date, notes: '' }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [bookCheckouts, setBookCheckouts] = useState<Checkout[]>([])
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState<Genre | 'All'>('All')
  const [bookForm, setBookForm] = useState<BookFormValues>(initialBookForm)
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormValues>(() => newCheckoutForm())
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadVersion, setLoadVersion] = useState(0)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [savingBook, setSavingBook] = useState(false)
  const [savingCheckout, setSavingCheckout] = useState(false)
  const selectionVersion = useRef(0)

  useEffect(() => {
    let active = true
    api.listBooks().then((result) => {
      if (active) setBooks(result)
    }).catch((error: unknown) => {
      if (active) setLoadError(errorMessage(error))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [loadVersion])

  function retryLoad() {
    setLoading(true)
    setLoadError(null)
    setLoadVersion((version) => version + 1)
  }

  async function handleSelectBook(bookId: number) {
    const version = ++selectionVersion.current
    setError(null)
    setNotice('')
    setSelectedBook(null)
    setBookCheckouts([])
    setLoadingDetail(true)
    try {
      const [book, checkouts] = await Promise.all([api.getBook(bookId), api.listBookCheckouts(bookId)])
      if (version !== selectionVersion.current) return
      setSelectedBook(book)
      setBookCheckouts(checkouts)
      setCheckoutForm((form) => ({ ...form, book_id: String(book.id) }))
    } catch (error) {
      if (version === selectionVersion.current) setError(errorMessage(error))
    } finally {
      if (version === selectionVersion.current) setLoadingDetail(false)
    }
  }

  async function handleCreateBook() {
    if (savingBook) return
    setSavingBook(true)
    setError(null)
    setNotice('')
    try {
      const book = await api.createBook({
        ...bookForm,
        title: bookForm.title.trim(),
        description: bookForm.description.trim(),
        author: bookForm.author.trim(),
        publisher_email: bookForm.publisher_email.trim(),
        shelf_location: bookForm.shelf_location.trim(),
      })
      setBooks((current) => [...current, book])
      setBookForm(initialBookForm)
      setSearch('')
      setGenreFilter('All')
      setNotice(`Added ${book.title} to the catalog.`)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setSavingBook(false)
    }
  }

  async function handleCreateCheckout() {
    if (savingCheckout) return
    const version = selectionVersion.current
    setSavingCheckout(true)
    setError(null)
    setNotice('')
    try {
      const checkout = await api.createCheckout({
        ...checkoutForm, patron_name: checkoutForm.patron_name.trim(), notes: checkoutForm.notes.trim(),
      })
      if (selectedBook?.id === checkout.book_id && version === selectionVersion.current) {
        setBookCheckouts((current) => [...current, checkout].sort((a, b) =>
          b.date.localeCompare(a.date) || b.id - a.id))
      }
      setCheckoutForm(newCheckoutForm(String(checkout.book_id)))
      setNotice(`Checkout recorded for ${checkout.patron_name}.`)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setSavingCheckout(false)
    }
  }

  const visibleBooks = books.filter((book) =>
    book.title.toLowerCase().includes(search.trim().toLowerCase()) &&
    (genreFilter === 'All' || book.genre === genreFilter))

  return (
    <main className="layout">
      <header className="page-header">
        <p className="eyebrow">LibraryConnect</p>
        <h1>LibraryConnect Resource Hub</h1>
        <p>Browse the catalog, add books, and keep track of patron checkouts.</p>
      </header>

      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {loadError && (
        <div className="error" role="alert">
          <p>{loadError}</p>
          <button onClick={retryLoad}>Retry loading books</button>
        </div>
      )}

      <div className="workspace">
        <div className="column">
          <BookList
            books={visibleBooks}
            search={search}
            genreFilter={genreFilter}
            onSearchChange={setSearch}
            onGenreChange={setGenreFilter}
            onSelectBook={(bookId) => void handleSelectBook(bookId)}
            genres={GENRES}
            loading={loading}
            unavailable={!!loadError}
            disabled={savingCheckout}
          />
          <BookDetail book={selectedBook} checkouts={bookCheckouts} loading={loadingDetail} />
        </div>
        <div className="column">
          <BookForm
            values={bookForm}
            genres={GENRES}
            onChange={setBookForm}
            onSubmit={() => void handleCreateBook()}
            submitting={savingBook}
            disabled={loading || !!loadError}
          />
          <CheckoutForm
            values={checkoutForm}
            books={books}
            onChange={setCheckoutForm}
            onSubmit={() => void handleCreateCheckout()}
            submitting={savingCheckout}
            disabled={loading || !!loadError || loadingDetail || books.length === 0}
          />
        </div>
      </div>
    </main>
  )
}

export default App
