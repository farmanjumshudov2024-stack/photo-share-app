export const metadata = {
  title: "Photo Share",
  description: "Upload and share photos publicly"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}