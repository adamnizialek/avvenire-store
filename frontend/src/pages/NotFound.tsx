import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold tracking-tight">404</h1>
      <p className="mt-4 text-muted-foreground">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Button asChild className="mt-8">
        <Link to="/">Back to Home</Link>
      </Button>
    </div>
  );
}
