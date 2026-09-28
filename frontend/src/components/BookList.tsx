import type { Book, Genre } from '../types'

type BookListProps = {
  books: Book[]
  search: string
  genreFilter: Genre | 'All'
  onSearchChange: (next: string) => void
  onGenreChange: (next: Genre | 'All') => void
  onSelectBook: (id: number) => void
  genres: Genre[]
  loading?: boolean
  unavailable?: boolean
  disabled?: boolean
}

function BookList({
  books,
  search,
  genreFilter,
  onSearchChange,
  onGenreChange,
  onSelectBook,
  genres,
  loading = false,
  unavailable = false,
  disabled = false,
}: BookListProps) {
  return (
    <section className="card">
      <h2>Books</h2>

      <div className="filters">
        <label htmlFor="book-search">Search</label>
        <input
          id="book-search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by title"
        />

        <label htmlFor="book-genre-filter">Genre</label>
        <select
          id="book-genre-filter"
          value={genreFilter}
          onChange={(event) => onGenreChange(event.target.value as Genre | 'All')}
        >
          <option value="All">All</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </div>

      {loading && <p role="status">Loading books…</p>}
      {!loading && !unavailable && books.length === 0 && (
        <p className="empty">{search.trim() || genreFilter !== 'All'
          ? 'No books match these filters. Try a different title or genre.'
          : 'Your catalog is empty. Add a book to get started.'}</p>
      )}
      <ul className="list">
        {books.map((book) => (
          <li key={book.id} className="list-item">
            <div>
              <strong>{book.title}</strong>
              <span className="tag">{book.genre}</span>
              <p className="book-meta">{book.author} · {book.shelf_location}</p>
            </div>
            <button disabled={disabled} onClick={() => onSelectBook(book.id)}>View Details</button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default BookList
