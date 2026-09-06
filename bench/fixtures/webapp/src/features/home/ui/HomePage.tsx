import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <section>
      <h1>Warehouse</h1>
      <p>
        <Link to="/orders">Open the order list</Link>
      </p>
    </section>
  );
}
