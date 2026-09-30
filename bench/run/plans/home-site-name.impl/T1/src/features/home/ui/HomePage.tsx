import { Link } from 'react-router-dom';

import { siteName } from '../../../site';

export function HomePage() {
  return (
    <section>
      <h1>{siteName}</h1>
      <p>
        <Link to="/orders">Open the order list</Link>
      </p>
    </section>
  );
}
