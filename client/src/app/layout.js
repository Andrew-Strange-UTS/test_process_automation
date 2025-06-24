// src/app/layout.js
export const metadata = {
    title: 'Test Runner UI',
    description: 'Run and manage Selenium tests from UI',
  };
  
  export default function RootLayout({ children }) {
    return (
      <html lang="en">
        <body style={{ margin: 0, padding: 0, fontFamily: 'sans-serif' }}>
          {children}
        </body>
      </html>
    );
  }