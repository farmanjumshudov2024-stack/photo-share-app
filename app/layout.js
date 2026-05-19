

export const metadata = {
  title: "Photo Share App",
  description: "Simple photo sharing app"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
