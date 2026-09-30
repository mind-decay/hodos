import { Link } from 'react-router-dom';

// The two destinations a shift lead has, named once and read by the test: a
// link to a path App.tsx does not carry is a dead link nothing else catches.
// The labels are the words on the shift board, which is why they are short.
const destinations = [
  { to: '/orders', label: 'Orders' },
  { to: '/shift', label: 'Handover' },
];

export function HomePage() {
  return (
    <section>
      <h1>Warehouse</h1>
      <nav aria-label="Sections">
        <ul>
          {destinations.map(({ to, label }) => (
            <li key={to}>
              <Link to={to}>{label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
