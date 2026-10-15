import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container content-section">
      <h1>Page not found / الصفحة غير موجودة</h1>
      <Link className="button button-primary" href="/en">
        PC Exchange Egypt
      </Link>
    </main>
  );
}
