import './globals.css';

export const metadata = {
  title: 'CampusOS — AUST',
  description: 'Campus data manager with an AI agent that reads and acts on live data.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
